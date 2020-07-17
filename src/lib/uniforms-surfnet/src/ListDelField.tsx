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
import React from "react";
import { connectField, filterDOMProps, joinName, useField } from "uniforms";

import { FieldProps } from "./types";

export type ListDelFieldProps = FieldProps<null, { initialCount?: number; itemProps?: {} }, null, HTMLSpanElement>;

// onChange not used on purpose
function ListDel({ disabled, name, id, onChange, ...props }: ListDelFieldProps) {
    const nameParts = joinName(null, name);
    const nameIndex = +nameParts[nameParts.length - 1];
    const parentName = joinName(nameParts.slice(0, -1));
    const parent = useField<{ minCount?: number }, unknown[]>(parentName, {}, { absoluteName: true })[0];

    const limitNotReached = !disabled && !(parent.minCount! >= parent.value!.length);

    return (
        <i
            id={`${id}.remove`}
            className={`fa fa-minus ${!limitNotReached ? "disabled" : ""}`}
            {...filterDOMProps(props)}
            onClick={() => {
                if (limitNotReached) {
                    const value = parent.value!.slice();
                    value.splice(nameIndex, 1);
                    parent.onChange(value);
                }
            }}
        />
    );
}

export default connectField(ListDel, { initialValue: false, kind: "leaf" });