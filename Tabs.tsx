/**
 * --------------------------------------------------------------------------
 * Tabs.tsx - The primary UI controller for the application.
 * --------------------------------------------------------------------------
 */
import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
// =========================================================================
// UI COMPONENT IMPORTS
// =========================================================================
import {
  ComponentsProvider,
  Tabs2,
  Tab2,
  FieldSelectMulti,
  Box,
  Spinner,
  Button,
  Space,
  Popover,
  PopoverContent,
  Calendar,
  List,
  ListItem,
  Accordion,
  AccordionContent,
  AccordionDisclosure,
  ButtonGroup,
  ButtonItem,
  Fieldset,
  theme as defaultTheme,
} from "@looker/components";
import { DateRange } from "@looker/components-date";
import { ExtensionContext } from "@looker/extension-sdk-react";
import { EmbeddedDashboard, IAllFilters as DashboardFilters } from "./Dashboards";
import { TABS_CONFIG } from "./config";

// =========================================================================
// TYPESCRIPT INTERFACES
// =========================================================================
export interface IAllFilters {
  [key:string]: string[];
}

interface FilterOption {
  value: string;
  label: string;
}

// =========================================================================
// CUSTOM THEME
// =========================================================================
const customTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    key: "#1A73E8",
  },
};

// A small helper function to format the text displayed on the date filter button.
const formatDateRange = (range: DateRange): string => {
    if ('from' in range && 'to' in range) {
        const from = range.from.toLocaleDateString();
        const to = range.to.toLocaleDateString();
        return from === to ? from : `${from} - ${to}`;
    }
    if ('type' in range) {
        return `Last ${range.value} ${range.unit}`;
    }
    return 'Select Date';
}

export const Tabs = () => {
  const { core40SDK: sdk } = useContext(ExtensionContext);

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  const [stagedFilters, setStagedFilters] = useState<IAllFilters>({});
  const [activeFilters, setActiveFilters] = useState<IAllFilters>({});
  const [filterOptions, setFilterOptions] = useState<{[key: string]: FilterOption[]}>({});
  const [dateRange, setDateRange] = useState<DateRange>({
    type: "last",
    value: 7,
    unit: "days",
  });
  const [isLoading, setIsLoading] = useState(true);

  // =========================================================================
  // DATA FETCHING & HYBRID CASCADING FILTER LOGIC
  // =========================================================================
  const fetchFilterOptions = useCallback(async (filterName: string, dependencies?: { [key: string]: string[] }) => {
    const filterConfig = TABS_CONFIG.filters.find(f => f.name === filterName);
    if (!filterConfig || !sdk) return;

    const queryBody: any = {
      model: TABS_CONFIG.lookml.model,
      view: TABS_CONFIG.lookml.explore,
      fields: [filterConfig.field],
      filters: {},
    };

    if (dependencies) {
      for (const parentFilterName in dependencies) {
        const parentValues = dependencies[parentFilterName];
        if (parentValues && parentValues.length > 0) {
          const parentConfig = TABS_CONFIG.filters.find(f => f.name === parentFilterName);
          if (parentConfig) {
            queryBody.filters[parentConfig.field] = parentValues.join(',');
          }
        }
      }
    }

    try {
      const result = await sdk.ok(sdk.run_inline_query({
        result_format: "json",
        body: queryBody,
      }));
      
      const options = result
        .filter((row: any) => row && row[filterConfig.field] != null)
        .map((row: any) => ({
          value: row[filterConfig.field].toString(),
          label: row[filterConfig.field].toString()
        }));

      setFilterOptions(prev => ({ ...prev, [filterName]: options }));
    } catch (error) {
      console.error(`Error fetching options for filter: ${filterName}`, error);
    }
  }, [sdk]);
  
  // This effect fetches ALL filters on initial load, making them independent by default.
  useEffect(() => {
    const fetchInitialOptions = async () => {
      setIsLoading(true);
      await Promise.all(TABS_CONFIG.filters.map(f => fetchFilterOptions(f.name)));
      setActiveFilters({ [TABS_CONFIG.date_filter.name]: ["last 7 days"] });
      setIsLoading(false);
    };
    if(sdk) {
      fetchInitialOptions();
    }
  }, [sdk, fetchFilterOptions]);

  // This effect handles the cascading logic. It watches for changes in the stagedFilters.
  useEffect(() => {
    const dependentFilters = TABS_CONFIG.filters.filter(f => f.listens_to && f.listens_to.length > 0);
    
    dependentFilters.forEach(depFilter => {
      const parentsWithValues: { [key: string]: string[] } = {};
      let hasAtLeastOneParentWithValue = false;

      depFilter.listens_to!.forEach(parentName => {
        const parentValues = stagedFilters[parentName];
        if (parentValues && parentValues.length > 0) {
          parentsWithValues[parentName] = parentValues;
          hasAtLeastOneParentWithValue = true;
        }
      });

      if (hasAtLeastOneParentWithValue) {
        fetchFilterOptions(depFilter.name, parentsWithValues);
      } else {
        fetchFilterOptions(depFilter.name);
      }
    });
  }, [stagedFilters, fetchFilterOptions]);

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================
  const handleFilterChange = useCallback((filterName: string, newValues: string[]) => {
    setStagedFilters(prevStagedFilters => {
        const oldValues = prevStagedFilters[filterName] || [];
        const newFilters = { ...prevStagedFilters, [filterName]: newValues };

        // This checks if the user only ADDED values. If they REMOVED any, it's not a pure addition.
        const isPureAddition = oldValues.every(val => newValues.includes(val));

        // We only clear the child filters if the change was NOT a pure addition (i.e., a value was removed or replaced).
        if (!isPureAddition) {
            // Recursively find all filters that depend on the one that just changed.
            const getAllDependents = (name: string): string[] => {
                const directChildren = TABS_CONFIG.filters
                    .filter(f => f.listens_to?.includes(name))
                    .map(f => f.name);
                
                return [
                    ...directChildren,
                    ...directChildren.flatMap(childName => getAllDependents(childName))
                ];
            };

            const dependentsToClear = getAllDependents(filterName);
            dependentsToClear.forEach(depName => {
                delete newFilters[depName];
            });
        }
      
      return newFilters;
    });
  }, []);

  const handleButtonGroupChange = useCallback((filterName: string, value: string) => {
    const newStagedFilters = { ...stagedFilters, [filterName]: [value] };
     const getAllDependents = (name: string): string[] => {
        const directChildren = TABS_CONFIG.filters
          .filter(f => f.listens_to?.includes(name))
          .map(f => f.name);
        return [
          ...directChildren,
          ...directChildren.flatMap(childName => getAllDependents(childName))
        ];
      };
      const dependentsToClear = getAllDependents(filterName);
      dependentsToClear.forEach(depName => {
        delete newStagedFilters[depName];
      });
    setStagedFilters(newStagedFilters);
  }, [stagedFilters]);

  const handleUpdateClick = useCallback(() => {
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}/${month}/${day}`;
    };

    let dateFilterString = '';
    if (dateRange) {
        if ('from' in dateRange && 'to' in dateRange) {
            dateFilterString = `${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`;
        } else if ('type' in dateRange) {
            dateFilterString = `${dateRange.type} ${dateRange.value} ${dateRange.unit}`;
        }
    }
    
    const newActiveFilters = {
        ...stagedFilters,
        [TABS_CONFIG.date_filter.name]: dateFilterString ? [dateFilterString] : [],
    };
    
    setActiveFilters(newActiveFilters);
  }, [stagedFilters, dateRange]);

  const handleResetClick = useCallback(() => {
    setStagedFilters({});
    setDateRange({ type: "last", value: 7, unit: "days" });
  }, []);

  const dashboardFilters = useMemo((): DashboardFilters => {
    const formatted: DashboardFilters = {};
    for (const filterName in activeFilters) {
      formatted[filterName] = activeFilters[filterName].join(',');
    }
    return formatted;
  }, [activeFilters]);

  // =========================================================================
  // RENDER METHOD (JSX)
  // =========================================================================
  const renderFilter = (filter: any) => {
    switch(filter.type) {
      case 'button_group':
        return (
          <Fieldset label={filter.label} inline>
            <ButtonGroup 
              value={stagedFilters[filter.name] ? stagedFilters[filter.name][0] : ''} 
              onChange={(value) => handleButtonGroupChange(filter.name, value)}
            >
              {(filterOptions[filter.name] || []).map(option => (
                <ButtonItem key={option.value} value={option.value}>{option.label}</ButtonItem>
              ))}
            </ButtonGroup>
          </Fieldset>
        );
      case 'select_multi':
      default:
        return (
          <Box width={300}>
            <FieldSelectMulti
              label={filter.label}
              values={stagedFilters[filter.name] || []}
              onChange={(values) => handleFilterChange(filter.name, values)}
              options={filterOptions[filter.name]}
              disabled={isLoading}
              isFilterable={true}
            />
          </Box>
        );
    }
  }

  return (
    <ComponentsProvider theme={customTheme}>
      <Box p="u4" borderBottom="1px solid" borderColor="ui2">
        <Accordion>
          <AccordionDisclosure>Filter Options</AccordionDisclosure>
          <AccordionContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-end" pt="u4">
              <Box display="flex" flexWrap="wrap" gap="u4" alignItems="flex-end">
                {TABS_CONFIG.filters.map(filter => (
                  <Box key={filter.name}>
                    {renderFilter(filter)}
                  </Box>
                ))}
                
                <Box>
                    <Popover
                        content={
                            <PopoverContent p="u2">
                                <Tabs2>
                                    <Tab2 id="presets" label="Presets">
                                        <List>
                                            <ListItem onClick={() => setDateRange({ type: "last", value: 7, unit: "days" })}>Last 7 Days</ListItem>
                                            <ListItem onClick={() => setDateRange({ type: "last", value: 14, unit: "days" })}>Last 14 Days</ListItem>
                                            <ListItem onClick={() => setDateRange({ type: "last", value: 30, unit: "days" })}>Last 30 Days</ListItem>
                                            <ListItem onClick={() => setDateRange({ type: "last", value: 90, unit: "days" })}>Last 90 Days</ListItem>
                                        </List>
                                    </Tab2>
                                    <Tab2 id="custom" label="Custom">
                                        <Calendar
                                            range={('from' in dateRange && 'to' in dateRange) ? dateRange : undefined}
                                            onSelectRange={setDateRange}
                                        />
                                    </Tab2>
                                </Tabs2>
                            </PopoverContent>
                        }
                    >
                        <Button>{formatDateRange(dateRange)}</Button>
                    </Popover>
                </Box>
              </Box>
              
              <Box pb="u2">
                <Space>
                  <Button onClick={handleUpdateClick}>Update</Button>
                  <Button onClick={handleResetClick}>Reset</Button>
                </Space>
              </Box>
            </Box>
          </AccordionContent>
        </Accordion>
      </Box>

      {isLoading ? (
        <Box p="u10" textAlign="center"><Spinner/></Box>
      ) : (
        <Tabs2>
          {TABS_CONFIG.dashboards.map(dash => (
            <Tab2 key={dash.id} id={dash.id} label={dash.label}>
              <EmbeddedDashboard
                id={dash.id}
                filters={dashboardFilters}
              />
            </Tab2>
          ))}
        </Tabs2>
      )}
    </ComponentsProvider>
  );
};
