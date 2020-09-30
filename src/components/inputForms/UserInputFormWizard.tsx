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

import { catchErrorStatus } from "api/index";
import UserInputForm from "components/inputForms/UserInputForm";
import I18n from "i18n-js";
import isEqual from "lodash/isEqual";
import hash from "object-hash";
import React from "react";
import ApplicationContext from "utils/ApplicationContext";
import { setFlash } from "utils/Flash";
import { FormNotCompleteResponse, InputForm } from "utils/types";
import { stop } from "utils/Utils";

interface Form {
    form: InputForm;
    hasNext?: boolean;
}

interface IProps {
    stepUserInput: InputForm;
    validSubmit: (form: {}[]) => Promise<void>;
    cancel: () => void;
    hasNext: boolean;
}

interface IState {
    forms: Form[];
    userInputs: {}[];
}

export default class UserInputFormWizard extends React.Component<IProps, IState> {
    public static defaultProps = {
        hasNext: false
    };

    context!: React.ContextType<typeof ApplicationContext>;

    constructor(props: IProps) {
        super(props);

        this.state = { forms: [{ form: props.stepUserInput, hasNext: props.hasNext }], userInputs: [] };
    }

    componentDidUpdate(prevProps: IProps) {
        if (!isEqual(this.props, this.state.forms[0]) && !isEqual(prevProps, this.props)) {
            this.setState({ forms: [{ form: this.props.stepUserInput, hasNext: this.props.hasNext }] });
        }
    }

    previous = (e: React.MouseEvent<HTMLButtonElement>) => {
        stop(e);
        let { forms } = this.state;

        forms.pop();

        this.setState({ forms: forms });
    };

    submit = (currentFormData: {}) => {
        const { forms, userInputs } = this.state;
        let newUserInputs = userInputs.slice(0, forms.length - 1);
        newUserInputs.push(currentFormData);

        let result = this.props.validSubmit(newUserInputs);
        return catchErrorStatus<FormNotCompleteResponse>(result, 510, json => {
            // Scroll to top when navigating to next screen of wizard
            window.scrollTo(0, 0);
            setFlash(I18n.t("process.flash.wizard_next_step"));
            this.setState({ forms: [...forms, { form: json.form, hasNext: json.hasNext }], userInputs: newUserInputs });
        });
    };

    render() {
        const { forms, userInputs } = this.state;

        const currentForm = forms[forms.length - 1];
        const currentUserInput = userInputs[forms.length - 1];

        if (!currentForm || !currentForm.form.properties) {
            return null;
        }

        return (
            <UserInputForm
                // Generate a key based on input widget names that results in a new
                // instance of UserInputForm if the form changes
                key={hash.sha1(currentForm.form.properties)}
                stepUserInput={currentForm.form}
                validSubmit={this.submit}
                previous={this.previous}
                hasNext={currentForm.hasNext}
                hasPrev={forms.length > 1}
                cancel={this.props.cancel}
                userInput={currentUserInput}
            />
        );
    }
}

UserInputFormWizard.contextType = ApplicationContext;