/**
 * This is the central configuration file for the entire application.
 * To change which dashboards or filters are displayed, you should only need to edit this file.
 */
export const TABS_CONFIG = {
  // =========================================================================
  // LOOKML CONFIGURATION
  // This section tells the application where to get the data for the filters.
  // =========================================================================
  lookml: {
    // The name of the Looker model to use.
    model: 'ecomm',
    // The name of the Explore within that model to query against.
    explore: 'order_items',
  },

  // =========================================================================
  // DASHBOARD CONFIGURATION
  // This array defines which dashboards appear as tabs in the UI.
  // =========================================================================
  dashboards: [
    { id: 'nXJRwDcnj1SY3mz3uJtEJt', label: 'Basic visualization examples' },
    { id: 'lCLlweEWzJ6EdGTgsIHjPB', label: 'Intermediate visualization examples' },
    { id: 'OYRrqT1Tyxqh9PY06I3rxo', label: 'Advanced visualization examples' },
  ],

  // =========================================================================
  // FILTER CONFIGURATION
  // To create a cascading filter, add a 'listens_to' property with an array of parent filter names.
  // =========================================================================
  filters: [
    { name: 'Country', label: 'Country', field: 'users.country', type: 'select_multi' },
    { name: 'State', label: 'State', field: 'users.state', type: 'select_multi', listens_to: ['Country'] },
    { name: 'City', label: 'City', field: 'users.city', type: 'select_multi', listens_to: ['Country', 'State'] },
    { name: 'Category', label: 'Category', field: 'products.category', type: 'select_multi' },
    { name: 'Department', label: 'Department', field: 'products.department', type: 'button_group' },
  ],

  // =========================================================================
  // DATE FILTER CONFIGURATION
  // =========================================================================
  date_filter: {
    name: 'Created Date',
    label: 'Created Date',
    type: 'simple',
  },
};

