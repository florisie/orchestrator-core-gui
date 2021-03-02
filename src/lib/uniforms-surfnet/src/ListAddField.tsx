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

import { FieldProps } from "lib/uniforms-surfnet/src/types";
import { intl } from "locale/i18n";
import cloneDeep from "lodash/cloneDeep";
import React from "react";
import { connectField, filterDOMProps, joinName, useField } from "uniforms";

export type ListAddFieldProps = FieldProps<string, { initialCount?: number; outerList?: boolean }>;

// onChange not used on purpose
function ListAdd({ disabled, name, value, onChange, initialCount, outerList = false, ...props }: ListAddFieldProps) {
    const nameParts = joinName(null, name);
    const parentName = joinName(nameParts.slice(0, -1));
    const parent = useField<{ maxCount?: number; initialCount?: number }, unknown[]>(
        parentName,
        {},
        { absoluteName: true }
    )[0];

    const limitNotReached = !disabled && !(parent.maxCount! <= Math.max(initialCount ?? 0, parent.value!.length));
    const count = 1 + Math.max((initialCount ?? 0) - parent.value!.length, 0);

    return (
        <div
            className="add-item"
            {...filterDOMProps(props)}
            onClick={() => {
                const newRowsValue = Array(count).fill(cloneDeep(value));
                if (limitNotReached) parent.onChange(parent.value!.concat(newRowsValue));
            }}
        >
            <i className={`fa fa-plus ${!limitNotReached || disabled ? "disabled" : ""}`} />
            <label>{outerList && intl.formatMessage({ id: `forms.fields.${parentName}_add` })}</label>
        </div>
    );
}

export default connectField(ListAdd, { initialValue: false, kind: "leaf" });
