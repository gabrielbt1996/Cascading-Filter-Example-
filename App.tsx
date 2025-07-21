/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// This is the main entry point for the React application.
import React from 'react'
// ExtensionProvider is a component from the Looker SDK that provides context
// to all other components in the application, giving them access to the Looker API.
import { ExtensionProvider } from '@looker/extension-sdk-react'
// `hot` is part of a developer tool that allows for "hot reloading"
// (seeing changes in the code without a full page refresh).
import { hot } from 'react-hot-loader/root'

// This is the main component for the tabbed dashboard interface.
import { Tabs } from './Tabs'

// The App component is wrapped with `hot` to enable hot-reloading.
export const App = hot(() => (
  // The ExtensionProvider must wrap the entire application. It establishes the
  // connection with the Looker Extension Framework.
  <ExtensionProvider>
    {/* The Tabs component is the main UI of this extension. */}
    <Tabs />
  </ExtensionProvider>
))
