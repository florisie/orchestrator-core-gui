import React from "react";
import I18n from "i18n-js";
import PropTypes from "prop-types";
import { usedVlans } from "../api";
import { isEmpty } from "../utils/Utils";
import { doValidateUserInput } from "../validations/UserInput";

export default class VirtualLAN extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            usedVlans: [],
            vlansInUse: [],
            missingInIms: false,
            invalidFormat: false
        };
    }

    componentDidMount = (subscriptionId = this.props.subscriptionId) => {
        if (subscriptionId) {
            usedVlans(subscriptionId)
                .then(result => this.setState({ usedVlans: result, missingInIms: false }))
                .catch(() => this.setState({ missingInIms: true }));
        }
    };

    componentWillReceiveProps(nextProps) {
        debugger;
        if (nextProps.subscriptionId && nextProps.subscriptionId !== this.props.subscriptionId) {
            this.componentDidMount(nextProps.subscriptionId);
        } else if (isEmpty(nextProps.subscriptionId)) {
            this.setState({ usedVlans: [] });
        }
    }

    vlansInUse = (vlanRange, usedVlans) => {
        const errors = {};
        doValidateUserInput({ name: "t", type: "vlan_range" }, vlanRange, errors);
        if (errors["t"]) {
            //semantically invalid so we don't validate against the already used ports
            return [];
        }
        const numbers = this.getAllNumbersForVlanRange(vlanRange);
        return numbers.filter(num =>
            usedVlans.some(used => (used.length > 1 ? num >= used[0] && num <= used[1] : num === used[0]))
        );
    };

    getAllNumbersForVlanRange = vlanRange => {
        return vlanRange
            .replace(/ /g, "")
            .split(",")
            .reduce((acc, val) => {
                const boundaries = val.split("-");
                const max = parseInt(boundaries[boundaries.length - 1], 10);
                const min = parseInt(boundaries[0], 10);
                return acc.concat(Array.from(new Array(max - min + 1), (x, i) => min + i));
            }, []);
    };

    validateUsedVlans = e => {
        const { onBlur } = this.props;
        const { usedVlans } = this.state;

        const err = {};
        const vlanRange = e.target.value;
        doValidateUserInput({ name: "n", type: "vlan_range" }, vlanRange, err);
        const inUse = this.vlansInUse(vlanRange, usedVlans);

        this.setState({ vlansInUse: inUse, invalidFormat: err["n"] });
        this.props.reportError(!isEmpty(inUse) || err["n"]);
        if (onBlur) {
            onBlur(e);
        }
    };

    render() {
        const { usedVlans, vlansInUse, missingInIms, invalidFormat } = this.state;
        const { onChange, vlan, subscriptionId, disabled, placeholder, servicePortTag } = this.props;
        const showAllPortsAvailable =
            subscriptionId &&
            isEmpty(usedVlans) &&
            !missingInIms &&
            (!servicePortTag === "SSP" || !servicePortTag === "untagged");
        const showWhichPortsAreInUse = !isEmpty(usedVlans) && !disabled && !missingInIms;
        const derivedPlaceholder =
            placeholder || (subscriptionId ? I18n.t("vlan.placeholder") : I18n.t("vlan.placeholder_no_msp"));
        return (
            <div className="virtual-vlan">
                <input
                    type="text"
                    value={vlan || ""}
                    placeholder={derivedPlaceholder}
                    disabled={!subscriptionId || disabled}
                    onChange={onChange}
                    onBlur={this.validateUsedVlans}
                />
                {!isEmpty(vlansInUse) && (
                    <em className="error">{I18n.t("vlan.vlansInUseError", { vlans: vlansInUse.join(", ") })}</em>
                )}
                {missingInIms && (
                    <em className="error">{I18n.t("vlan.missingInIms", { vlans: vlansInUse.join(", ") })}</em>
                )}
                {showWhichPortsAreInUse && (
                    <em>
                        {I18n.t("vlan.vlansInUse", {
                            vlans: usedVlans.map(arr => arr.join("-")).join(", ")
                        })}
                    </em>
                )}
                {showAllPortsAvailable && <em>{I18n.t("vlan.allPortsAvailable")}</em>}
                {invalidFormat && <em className="error">{I18n.t("service_ports.invalid_vlan")}</em>}
            </div>
        );
    }
}

VirtualLAN.propTypes = {
    onChange: PropTypes.func.isRequired,
    onBlur: PropTypes.func,
    reportError: PropTypes.func.isRequired,
    vlan: PropTypes.string,
    subscriptionId: PropTypes.string,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string,
    servicePortTag: PropTypes.string
};
