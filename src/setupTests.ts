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
import { configure } from "enzyme";
//@ts-ignore
import Adapter from "enzyme-adapter-react-16";
import fetchMock from "fetch-mock-jest";
import I18n from "i18n-js";
import en from "locale/en";

// Enable fetchMock as global fetch mock
global.fetch = fetchMock.sandbox();

beforeEach(() => {
    fetchMock.restore();
});

// we need to use them, otherwise the imports are deleted when organizing them
expect(I18n).toBeDefined();
expect(en).toBeDefined();
I18n.locale = "en";

configure({ adapter: new Adapter() });