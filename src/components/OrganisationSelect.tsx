/*
 * Copyright 2019 SURF.
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

import React from "react";
import Select, { ValueType } from "react-select";
import { Organization, Option } from "../utils/types";

interface IProps {
    id: string;
    onChange: (option: Option) => void;
    organisation: string;
    organisations: Organization[];
    disabled: boolean;
}

export default class OrganisationSelect extends React.PureComponent<IProps> {
    render() {
        const { id, onChange, organisation, organisations, disabled } = this.props;

        const options = organisations.map((org: Organization) => ({
            value: org.uuid,
            label: org.name
        }));
        const value = options.find((option: Option) => option.value === organisation);

        return (
            <Select
                id={id}
                onChange={onChange as (value: ValueType<Option>) => void}
                options={options}
                value={value}
                isSearchable={true}
                placeholder="Search and select a customer..."
                isDisabled={disabled || organisations.length === 0}
            />
        );
    }
}