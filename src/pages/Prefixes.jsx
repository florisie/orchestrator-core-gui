import React from "react";
import I18n from "i18n-js";
import PropTypes from "prop-types";
import debounce from "lodash/debounce";
import {isEmpty, stop, isValidUUIDv4} from "../utils/Utils";

import "./Prefixes.css";
import {freeSubnets, prefix_filters, prefixSubscriptionsByRootPrefix} from "../api";
import FilterDropDown from "../components/FilterDropDown";
import {organisationNameByUuid, renderDate, ipamStates, ipAddressToNumber, familyFullName} from "../utils/Lookups";


export default class Prefixes extends React.PureComponent {

  constructor(props) {
    super(props);

    this.debouncedCount = debounce(this.count, 1500, {leading: true, trailing: true});
    this.debouncedRunQuery = debounce(this.runQuery, 800);

    this.state = {
      prefixes: [],
      query: "",
      searchResults: [],
      sortOrder: {name: "prefix", descending: false},
      filterAttributes: {
        state: ipamStates.filter(s => s).map(state =>
          ({name: state, selected: (state === "Allocated"), count: 0})),
        rootPrefix: [],
      },
      rootPrefixes: [],
      ipPrefixProductId: props.products.filter(p => p.name === "IP_PREFIX").map(p => p.product_id).pop(),
      availablePrefixId: 10000
    }
  };

  componentDidMount(){
    this.setState({})
    prefix_filters()
      .then(result => {
          const prefixFilters = result.map((p, idx) => ({name: p.prefix, selected: (idx === 0), count: 0}));
          const currentFilterAttributes = this.state.filterAttributes;
          const modifiedAttributes = {rootPrefix: prefixFilters}
          this.setState({rootPrefixes: result, filterAttributes: {...currentFilterAttributes, ...modifiedAttributes}});
          this.getFreePrefixes(result);
          this.getPrefixSubscriptions(result);
      });
   };

  componentDidUpdate(prevProps, prevState) {
      if (this.state.prefixes !== prevState.prefixes) {
          this.debouncedCount();
      }
  };

   getPrefixSubscriptions = roots => {
      const {organisations} = this.props;
      return roots.map(p =>
          prefixSubscriptionsByRootPrefix(p.id)
          .then(result => result.map(prefix => {
              const {customer_id, start_date, subscription_id} = prefix;
              const organisation = customer_id === undefined ? "Unknown" : organisationNameByUuid(customer_id, organisations);
              const subscription = subscription_id === undefined ? "Missing": subscription_id;
              return {...prefix, customer: organisation, start_date_as_str: renderDate(start_date), subscription_id: subscription};
          }))
            .then(result => {
                this.setState(prevState => ({prefixes: prevState.prefixes.concat(result)}))
            })
      )
  };

  getFreePrefixes = roots => {
        const now = Math.floor(Date.now() / 1000);
        const nowString = renderDate(now);
        return roots.map(p =>
            freeSubnets(p.prefix)
                .then(result => {
                  const {availablePrefixId} = this.state;
                  const free = result.map((r, idx) => {
                      const [networkAddress, prefixlen] = r.split("/");
                      return {
                        id: availablePrefixId + idx,
                        customer: "N/A",
                        subscription_id: "N/A",
                        start_date: now,
                        start_date_as_str: nowString,
                        description: "Vrije ruimte - gegenereerd",
                        family: p.version,
                        prefix: r,
                        network_address_as_int: ipAddressToNumber(networkAddress),
                        prefixlen: parseInt(prefixlen, 10),
                        parent: p.prefix,
                        state: ipamStates.indexOf("Free")
                      };
                  });
                  this.setState(prevState => ({
                      prefixes: prevState.prefixes.concat(free),
                      availablePrefixId: prevState.availablePrefixId + free.length
                  }));
                })
            )
  };


  count = () => {
      const {prefixes, filterAttributes} = this.state;
      const {state, rootPrefix} = filterAttributes;
      const stateCount = state.map(attr => {
          const newCount = prefixes.reduce((acc, p) => {
              return ipamStates[p.state] === attr.name ? acc + 1: acc;
          }, 0);
          return newCount === attr.count? attr: {...attr, count: newCount};
      });
      const rootPrefixCount = rootPrefix.map(attr => {
          const newCount = prefixes.reduce((acc, p) => {
              return p.parent === attr.name ? acc + 1: acc;
          }, 0);
          return newCount === attr.count ? attr: {...attr, count: newCount};
      });
      this.setState({
          filterAttributes: {
              state: stateCount,
              rootPrefix: rootPrefixCount,
              }
      });
  };

  setFilter = filterName => item => {
    const currentFilterAttributes = this.state.filterAttributes;
    var modifiedAttributes = {};
    modifiedAttributes[filterName] = currentFilterAttributes[filterName].map(attr => {
        if (attr.name === item.name) {
            attr.selected = !attr.selected;
        }
        return attr;
    });
    this.setState({
        filterAttributes: {...currentFilterAttributes, ...modifiedAttributes},
        }
    );
  };

  singleSelectFilter = filterName => (e, item) => {
      stop(e);
      const currentFilterAttributes = this.state.filterAttributes;
      var modifiedAttributes = {};
      modifiedAttributes[filterName] = currentFilterAttributes[filterName].map(attr => {
          if (attr.name !== item.name && attr.selected) {
              attr.selected = false;
          } else if (attr.name === item.name && !attr.selected) {
              attr.selected = true;
          }
          return attr;
      })
      this.setState({
          filterAttributes: {...currentFilterAttributes, ...modifiedAttributes}
      })
  };

  selectAll = filterName => e => {
      stop(e);
      const currentFilterAttributes = this.state.filterAttributes;
      var modifiedAttributes = {};
      modifiedAttributes[filterName] = currentFilterAttributes[filterName].map(attr => {
          if (!attr.selected) {
              attr.selected = true;
          }
          return attr;
      })
      this.setState({
          filterAttributes: {...currentFilterAttributes, ...modifiedAttributes}
      })
  };

  filter = unfiltered => {
      const {state, rootPrefix} = this.state.filterAttributes;
      return unfiltered.filter(prefix => {
       const stateFilter = state.find(attr => ipamStates.indexOf(attr.name) === prefix.state);
       const rootPrefixFilter = rootPrefix.find(attr => attr.name === prefix.parent);

       return (stateFilter ? stateFilter.selected : true)
              && (rootPrefixFilter ? rootPrefixFilter.selected : true)
      });
  };

  sortBy = name => (a, b) => {
      const aSafe = a[name] === undefined ? "" : a[name];
      const bSafe = b[name] === undefined ? "" : b[name];
      if (name === "prefix") {
        return a["network_address_as_int"] - b["network_address_as_int"];
    } else if (name === "state") {
        return ipamStates[parseInt(aSafe,10)].localeCompare(ipamStates[parseInt(bSafe,10)]);
    } else {
        return typeof aSafe === "string" ? aSafe.toLowerCase().localeCompare(bSafe.toString().toLowerCase()) : aSafe - bSafe;
      }
    };

  toggleSort = name => e => {
      stop(e);
      const sortOrder = {...this.state.sortOrder};
      sortOrder.descending = sortOrder.name === name ? !sortOrder.descending : false;
      sortOrder.name = name;
      this.setState({sortOrder: sortOrder});
  };

  sort = unsorted => {
      const {name, descending} = this.state.sortOrder;
      const sorted = unsorted.sort(this.sortBy(name));
      if (descending) {
          sorted.reverse();
      }
      return sorted;
  };

  search = e => {
    const query = e.target.value;
    this.setState({query: query});
    this.debouncedRunQuery(query);
  };

  runQuery = query => {
     const {prefixes} = this.state;
     const queryToLower = query.toLowerCase();
     const results = prefixes.filter(prefix => {
                return (prefix.prefix.toLowerCase().includes(queryToLower)
                || prefix.customer.toLowerCase().includes(queryToLower)
                || prefix.description.toLowerCase().includes(queryToLower)
                || ipamStates[prefix.state].toLowerCase().includes(queryToLower)
                || queryToLower === familyFullName[prefix.family].toLowerCase()
                || prefix.start_date_as_str.includes(query))
    });
    this.setState({searchResults: results});
  };

  sortColumnIcon = (name, sorted) => {
     if (sorted.name === name) {
         return <i className={sorted.descending ? "fa fa-sort-desc" : "fa fa-sort-asc"}></i>
     }
     return <i/>;
  };

  subscriptionLink = (selection)  => () => {
      const {subscription_id, prefix, prefixlen} = selection;
      const product_id = this.state.ipPrefixProductId;
      if (isValidUUIDv4(subscription_id)) {
         this.props.history.push("/subscription/" + subscription_id);

      } else if (subscription_id === "N/A") {
        let network = prefix.split("/")[0];
        this.props.history.push(`new-process/?product=${product_id}&prefix=${network}&prefixlen=${prefixlen}`)
      }
  }

  render() {
    const columns = ["customer", "subscription_id", "description", "family", "prefixlen", "prefix", "parent", "state", "start_date"];
    const th = index => {
      const name = columns[index];
      return (
        <th key={index} className={name} onClick={this.toggleSort(name)}>
          <span>{I18n.t(`prefixes.${name}`)}</span>
          {this.sortColumnIcon(name, this.state.sortOrder)}
        </th>
      )
    };
    const {prefixes, query, searchResults, filterAttributes} = this.state;
    const filteredPrefixes = isEmpty(query) ? this.filter(prefixes) : this.filter(searchResults);
    const sortedPrefixes = this.sort(filteredPrefixes);

    return <div className="mod-prefixes">
      <div className="card">
    <div className="options">
        <FilterDropDown items={filterAttributes.rootPrefix}
            filterBy={this.setFilter("rootPrefix")}
            singleSelectFilter={this.singleSelectFilter("rootPrefix")}
            selectAll={this.selectAll("rootPrefix")}
            label={I18n.t("prefixes.filters.root_prefix")}
            noTrans={true}/>
        <FilterDropDown items={filterAttributes.state}
            filterBy={this.setFilter("state")}
            singleSelectFilter={this.singleSelectFilter("state")}
            selectAll={this.selectAll("state")}
            label={I18n.t("prefixes.filters.state")}/>

        <section className="search">
        <input className="allowed"
         placeholder={I18n.t("prefixes.searchPlaceHolder")}
         type="text"
         onChange={this.search}
         value={query}/>
        <i className="fa fa-search"></i>
        </section>
    </div>
      </div>
      <section className="prefixes">
      <table className="prefixes">
    <thead>
        <tr>{columns.map((column, index) => th(index))}</tr>
    </thead>
    <tbody>
    {sortedPrefixes.map(prefix =>
      <tr key={prefix.id} onClick={this.subscriptionLink(prefix)}
        className={ipamStates[prefix.state]}>
        <td data-label={I18n.t("prefixes.customer")}
          className="customer">{prefix.customer}</td>
        <td data-label={I18n.t("prefixes.subscription_id")}
          className="subscription">{prefix.subscription_id.substring(0,8)}</td>
        <td data-label={I18n.t("prefixes.description")}
          className="description">{prefix.description}</td>
        <td data-label={I18n.t("prefixes.family")}
          className="family">{familyFullName[prefix.family]}</td>
        <td data-label={I18n.t("prefixes.prefixlen")}
      className="prefixlen">/{prefix.prefixlen}</td>
        <td data-label={I18n.t("prefixes.prefix")}
          className="prefix">{prefix.prefix}</td>
        <td data-label={I18n.t("prefixes.parent")}
      className="parent">{prefix.parent}</td>
        <td data-label={I18n.t("prefixes.state")}
          className="state">{ipamStates[prefix.state]}</td>
        <td data-label={I18n.t("prefixes.start_date")}
          className="start_date">{prefix.start_date_as_str}</td>
      </tr>
      )
    }
    </tbody>
        </table>
     </section>
  </div>
    };
};

Prefixes.propTypes = {
    history: PropTypes.object.isRequired,
    organisations: PropTypes.array.isRequired,
    products: PropTypes.array.isRequired
};