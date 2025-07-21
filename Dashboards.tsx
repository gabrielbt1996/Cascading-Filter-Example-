/**
 * --------------------------------------------------------------------------
 * Dashboards.tsx - The Dashboard Embedding Component
 * --------------------------------------------------------------------------
 * This component's single responsibility is to embed a Looker dashboard
 * into the page and handle updates to its filters efficiently.
 */
import React, { useCallback, useEffect, useContext, useState } from "react";
import { LookerEmbedSDK, LookerDashboard } from "@looker/embed-sdk";
import styled from "styled-components";
import { ExtensionContext } from "@looker/extension-sdk-react";

// =========================================================================
// TYPESCRIPT INTERFACES
// =========================================================================

// Defines the shape of the filter object that will be passed to the dashboard.
// It's a key-value pair where the key is the filter name and the value is a comma-separated string.
export interface IAllFilters {
  [key: string]: string;
}

// Defines the props (properties) that this component accepts from its parent (Tabs.tsx).
interface EmbeddedDashboardProps {
  id: string; // The ID of the dashboard to embed (e.g., '123').
  filters: IAllFilters; // The currently active filter values.
}

export const EmbeddedDashboard = (props: EmbeddedDashboardProps) => {
  // Get the Extension SDK context. This is crucial for getting the Looker
  // host URL dynamically, which makes the extension portable.
  const { extensionSDK } = useContext(ExtensionContext);
  // A state variable to hold the live dashboard object once it's created.
  // This allows us to interact with it later (e.g., to update filters).
  const [dashboard, setDashboard] = useState<LookerDashboard>();

  // A simple function to store the created dashboard object in our component's state.
  const setupDashboard = (dashboardInstance: LookerDashboard) => {
    setDashboard(dashboardInstance);
  };

  // This `useEffect` hook is the key to efficient filter updates.
  // It runs *only* when the `dashboard` object is created or when `props.filters` changes.
  useEffect(() => {
    // Check if the dashboard is ready and if there are filters to apply.
    if (dashboard && props.filters) {
      // Send a message to the existing dashboard iframe to update its filters.
      // This is much faster than reloading the entire iframe.
      dashboard.updateFilters(props.filters);
      // After updating the filters, tell the dashboard to re-run its queries.
      dashboard.run();
    }
  }, [dashboard, props.filters]); // The dependency array ensures this only runs when needed.

  // This `useCallback` hook is responsible for the one-time creation of the dashboard.
  // The `ref` in the JSX below passes the div element `el` to this function.
  const embedCtrRef = useCallback((el: HTMLDivElement) => {
    const hostUrl = extensionSDK?.lookerHostData?.hostUrl;
    // Only proceed if we have a div to render into (`el`) and the hostUrl is available.
    if (el && hostUrl) {
      el.innerHTML = ""; // Clear any previous content.
      // Initialize the Looker Embed SDK with the dynamic host URL.
      LookerEmbedSDK.init(hostUrl);
      // Start building the dashboard object.
      LookerEmbedSDK.createDashboardWithId(props.id)
        .withNext() // Use .withNext() for modern SSO embedding in extensions.
        // TO CUSTOMIZE THEME: Change 'Custom' to the name of a theme defined in your Looker instance.
        .withTheme('Custom')
        // Apply the initial set of filters when the dashboard first loads.
        .withFilters(props.filters)
        // Tell the SDK which div to render the dashboard iframe into.
        .appendTo(el)
        // Finalize the dashboard configuration.
        .build()
        // Establish the connection to the Looker instance.
        .connect()
        // Once connected, call `setupDashboard` to save the live dashboard object to our state.
        .then(setupDashboard)
        // If anything goes wrong, log the error to the console for debugging.
        .catch((error) => {
          console.error("Connection error", error);
        });
    }
    // This hook depends on the dashboard id and the extensionSDK to ensure it
    // has the necessary information before trying to embed.
  }, [props.id, extensionSDK]);

  // The component returns a styled div. The `ref={embedCtrRef}` attribute is what
  // triggers the `useCallback` hook above to run once this div is rendered on the page.
  return <EmbedContainer ref={embedCtrRef}></EmbedContainer>;
};

// =========================================================================
// STYLED COMPONENTS
// This uses the `styled-components` library to create a div with CSS styles.
// TO CUSTOMIZE APPEARANCE: You can change the CSS properties here.
// =========================================================================
export const EmbedContainer = styled.div`
  width: 100%;
  height: 95vh; /* This makes the dashboard take up 95% of the viewport height. */
  & > iframe {
    width: 100%;
    height: 100%;
    border: 0; /* Removes the default iframe border. */
  }
`;
