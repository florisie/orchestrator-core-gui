/*
 * Copyright 2019-2020 SURF.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { EuiIcon, EuiModal, EuiPanel, EuiSpacer, EuiTab, EuiTabs } from "@elastic/eui";
import React, { Fragment } from "react";

import ApplicationContext from "../../utils/ApplicationContext";
import FavoritePortSelector from "./components/FavoritePortSelector";
import ServicePortSelector from "./components/ServicePortSelector";

const tabs = [
    {
        id: "nodeFilter",
        name: (
            <span>
                Node filter &nbsp;
                <EuiIcon type="filter" />
            </span>
        ),
        disabled: false
    },
    {
        id: "favoritePorts",
        name: (
            <span>
                Favorite ports &nbsp;
                <EuiIcon type="heart" />
            </span>
        ),
        disabled: false
    }
];

interface IProps {
    selectedTabId: string;
    handleSelect: any;
}

interface IState {
    selectedTabId: string;
}

export default class ServicePortSelectorModal extends React.PureComponent<IProps, IState> {
    public static defaultProps = {
        selectedTabId: "nodeFilter"
    };

    constructor(props: IProps) {
        super(props);

        this.state = {
            selectedTabId: this.props.selectedTabId
        };
    }

    // onSelectedTabChanged = () => this.setState({ isSwitchChecked: !this.state.isSwitchChecked });
    onSelectedTabChanged = (id: string) => {
        this.setState({ selectedTabId: id });
    };

    render() {
        const { selectedTabId } = this.state;
        const renderTabs = () => {
            return tabs.map((tab, index) => (
                <EuiTab
                    onClick={() => this.onSelectedTabChanged(tab.id)}
                    isSelected={tab.id === selectedTabId}
                    disabled={tab.disabled}
                    key={index}
                >
                    {tab.name}
                </EuiTab>
            ));
        };
        return (
            <EuiPanel>
                <EuiTabs>{renderTabs()}</EuiTabs>
                <EuiSpacer size="l" />
                {selectedTabId === "nodeFilter" && (
                    <ServicePortSelector subscriptions={[]} handleSelect={this.props.handleSelect} />
                )}
                {selectedTabId === "favoritePorts" && (
                    <FavoritePortSelector subscriptions={[]} handleSelect={this.props.handleSelect} />
                )}
            </EuiPanel>
        );
    }
}

ServicePortSelectorModal.contextType = ApplicationContext;
