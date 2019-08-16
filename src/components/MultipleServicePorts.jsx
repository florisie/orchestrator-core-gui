import React from "react";
import PropTypes from "prop-types";
import I18n from "i18n-js";
import { stop } from "../utils/Utils";

import "./MultipleServicePorts.scss";
import ServicePortSelect from "./ServicePortSelect";
import VirtualLAN from "./VirtualLAN";
import { fetchPortSpeedBySubscription, parentSubscriptions } from "../api";

export default class MultipleServicePorts extends React.PureComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            bandwidthErrors: {},
            usedSSPDescriptions: {}
        };
    }

    onChangeInternal = (name, index) => e => {
        const servicePorts = [...this.props.servicePorts];
        let value;
        this.clearErrors(index);
        if (name === "subscription_id") {
            value = e ? e.value : null;
            if (e !== null) {
                const port = this.props.availableServicePorts.find(x => x.subscription_id === value);
                if (port.tag === "SSP") {
                    // The SSP may not be used in other LP's (except when they are terminated)
                    parentSubscriptions(value).then(res => {
                        const usedSSPDescriptions = { ...this.state.usedSSPDescriptions };
                        let filteredParents = res.json.filter(parent => parent.status !== "terminated");
                        if (filteredParents.length > 0) {
                            usedSSPDescriptions[index] = filteredParents.map(parent => parent.description).join(", ");
                        } else {
                            usedSSPDescriptions[index] = false;
                        }
                        this.setState({ usedSSPDescriptions: usedSSPDescriptions });
                    });
                    // Reset VLAN to ensure a correct switch from MSP to SSP
                    servicePorts[index].vlan = "";
                }
                servicePorts[index].tag = port.product.tag;
            }
        } else {
            value = e.target ? e.target.value : null;
        }
        servicePorts[index][name] = value;
        this.props.onChange(servicePorts);
    };

    clearErrors = index => {
        const usedSSPDescriptions = { ...this.state.usedSSPDescriptions };
        usedSSPDescriptions[index] = false;
        this.setState({ usedSSPDescriptions: usedSSPDescriptions });
    };

    addServicePort = () => {
        const servicePorts = [...this.props.servicePorts];
        servicePorts.push({ subscription_id: null, vlan: "" });
        this.props.onChange(servicePorts);
    };

    removeServicePort = index => e => {
        stop(e);
        const servicePorts = [...this.props.servicePorts];
        servicePorts.splice(index, 1);
        this.props.onChange(servicePorts);
    };

    reportVlanError = isError => this.props.reportError(isError);

    bubbleUpErrorState = () => {
        const { bandwidthErrors, usedSSPDescriptions } = this.state;
        const inValid = Object.values(bandwidthErrors)
            .concat(Object.values(usedSSPDescriptions))
            .some(val => val);
        this.props.reportError(inValid);
    };

    validateMaxBandwidth = index => e => {
        const bandwidth = e.target.value;
        if (bandwidth) {
            const servicePort = this.props.servicePorts[index];
            fetchPortSpeedBySubscription(servicePort.subscription_id).then(res => {
                const bandwidthErrors = { ...this.state.bandwidthErrors };
                bandwidthErrors[index] = parseInt(bandwidth, 10) > parseInt(res, 10);
                this.setState({ bandwidthErrors: bandwidthErrors }, this.bubbleUpErrorState);
            });
        }
    };

    renderServicePort = (
        servicePorts,
        servicePort,
        index,
        availableServicePorts,
        organisations,
        organisationId,
        minimum,
        maximum,
        disabled,
        usedSSPDescriptions,
        bandwidthErrors,
        isElan,
        organisationPortsOnly,
        mspOnly
    ) => {
        // TC the statement below filters the selected-value of itself and of it's sibling components
        let inSelect = availableServicePorts.filter(
            port =>
                port.subscription_id === servicePort.subscription_id ||
                !servicePorts.some(x => x.subscription_id === port.subscription_id)
        );
        // PB let op er is ook een filter die een andere lijst van servicePorts ophaalt in procesdetail.jsx
        // TC above check already implemented in new-process.jsx
        if (isElan || mspOnly) {
            // >2 == ELAN
            inSelect = inSelect.filter(port => port.product.tag === "MSP" || port.product.tag === "MSPNL");
        }

        if (organisationPortsOnly) {
            inSelect = inSelect.filter(port => port.customer_id === organisationId);
        }
        const showDelete = maximum > 2 && !disabled;
        const vlanPlaceholder =
            servicePort.tag === "SSP"
                ? I18n.t("vlan.ssp")
                : servicePort.subscription_id
                ? I18n.t("vlan.placeholder")
                : isElan
                ? I18n.t("vlan.placeholder_no_msp")
                : I18n.t("vlan.placeholder_no_service_port");
        return (
            <section className="msp" key={index}>
                <div className="wrapper msp-select">
                    {index === 0 && <label>{I18n.t("service_ports.servicePort")}</label>}
                    <ServicePortSelect
                        key={index}
                        onChange={this.onChangeInternal("subscription_id", index)}
                        servicePort={servicePort.subscription_id}
                        servicePorts={inSelect}
                        organisations={organisations}
                        disabled={disabled}
                    />
                    {usedSSPDescriptions[index] && (
                        <em className="error">
                            {I18n.t("service_ports.used_ssp", {
                                descriptions: usedSSPDescriptions[index]
                            })}
                        </em>
                    )}
                </div>
                <div className="wrapper">
                    {index === 0 && <label>{I18n.t("service_ports.vlan")}</label>}
                    <div className="vlan">
                        <VirtualLAN
                            vlan={servicePort.tag === "SSP" ? "0" : servicePort.vlan}
                            onChange={this.onChangeInternal("vlan", index)}
                            subscriptionId={servicePort.subscription_id}
                            disabled={disabled || servicePort.tag === "SSP" || !servicePort.subscription_id}
                            placeholder={vlanPlaceholder}
                            servicePortTag={servicePort.tag}
                            reportError={this.reportVlanError}
                        />
                        {!isElan && showDelete && (
                            <i
                                className={`fa fa-minus ${index < minimum ? "disabled" : ""}`}
                                onClick={this.removeServicePort(index)}
                            />
                        )}
                    </div>
                </div>
                {isElan && (
                    <div className="wrapper">
                        {index === 0 && <label>{I18n.t("service_ports.bandwidth")}</label>}
                        <div className="bandwidth">
                            <input
                                type="number"
                                name={`bandwidth_${index}`}
                                value={servicePort.bandwidth || ""}
                                placeholder={
                                    servicePort.subscription_id
                                        ? I18n.t("service_ports.bandwidth_placeholder")
                                        : I18n.t("service_ports.bandwidth_no_msp_placeholder")
                                }
                                onChange={this.onChangeInternal("bandwidth", index)}
                                onBlur={this.validateMaxBandwidth(index)}
                                disabled={disabled || !servicePort.subscription_id}
                            />
                            {isElan && showDelete && (
                                <i
                                    className={`fa fa-minus ${index < minimum ? "disabled" : ""}`}
                                    onClick={this.removeServicePort(index)}
                                />
                            )}
                        </div>
                        {bandwidthErrors[index] && (
                            <em className="error">{I18n.t("service_ports.invalid_bandwidth", { max: 1000 })}</em>
                        )}
                    </div>
                )}
            </section>
        );
    };

    render() {
        const {
            availableServicePorts,
            servicePorts,
            organisations,
            organisationId,
            minimum,
            maximum,
            disabled,
            isElan,
            organisationPortsOnly,
            mspOnly
        } = this.props;
        const { bandwidthErrors, usedSSPDescriptions } = this.state;
        const showAdd = maximum > 2 && !disabled;
        return (
            <section className="multiple-mps">
                {servicePorts.map((servicePort, index) =>
                    this.renderServicePort(
                        servicePorts,
                        servicePort,
                        index,
                        availableServicePorts,
                        organisations,
                        organisationId,
                        minimum,
                        maximum,
                        disabled,
                        usedSSPDescriptions,
                        bandwidthErrors,
                        isElan,
                        organisationPortsOnly,
                        mspOnly
                    )
                )}
                {showAdd && (
                    <div className="add-msp">
                        <i className="fa fa-plus" onClick={this.addServicePort} />
                    </div>
                )}
            </section>
        );
    }
}

MultipleServicePorts.propTypes = {
    onChange: PropTypes.func.isRequired,
    availableServicePorts: PropTypes.array.isRequired,
    servicePorts: PropTypes.array.isRequired,
    organisations: PropTypes.array.isRequired,
    organisationId: PropTypes.string,
    minimum: PropTypes.number,
    maximum: PropTypes.number.isRequired,
    disabled: PropTypes.bool,
    isElan: PropTypes.bool,
    organisationPortsOnly: PropTypes.bool,
    mspOnly: PropTypes.bool,
    reportError: PropTypes.func.isRequired
};

MultipleServicePorts.defaultProps = {
    minimum: 2
};
