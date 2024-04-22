import * as app from './app.js'

const data = await app.fetchData()
const rate = await app.fetchRate()

const now = new Date()
const graphPeriodStart = {
  hour: new Date(new Date().setDate(now.getDate() - 1)),
  day: new Date(new Date().setDate(now.getDate() - 1)),
  week: new Date(new Date().setDate(now.getDate() - 7)),
  month: new Date(new Date().setMonth(now.getMonth() - 1)),
  quarter: new Date(new Date().setMonth(now.getMonth() - 3)),
  ytd: new Date(new Date().getFullYear(), 0, 1),
  year: new Date(new Date().setFullYear(now.getFullYear() - 1)),
  century: new Date(0),
}

// https://observablehq.com/@vega/vega-lite-api-v5#standalone_use
// https://vega.github.io/vega-lite/docs/config.html
const options = {
  config: {
    mark: {tooltip: null},
  },
  init: (view) => {
    view.tooltip(new vegaTooltip.Handler().call)
    if (view.container()) view.container().style['overflow-x'] = 'auto'
  },
  view: {
    renderer: 'canvas',
  },
}

// register vega and vega-lite with the API
vl.register(vega, vegaLite, options)

/**
 * Render the graphs
 * @param {HTMLElement} input - The input element
 */
export async function renderGraphs(input) {
  // clearly this is fragile, though this uses html structure to find the graphs to render on input change
  const htmlSwitch = input?.id === 'switch' ? input : undefined
  const siblings = input
    ? htmlSwitch
      ? input.parentElement.parentElement.parentElement.parentElement.querySelectorAll('.graph')
      : input.parentElement.parentElement.parentElement.querySelectorAll('.graph')
    : document.querySelectorAll('.graph')
  // default to month view

  for (const element of siblings) {
    const metric = element.id
    let period = input?.tagName === 'SELECT' ? input?.value || 'month' : 'month'
    if (metric === 'nft_sales_volume') period = 'century'
    const title = element.getAttribute('data-title')?.toUpperCase()
    const spec = element.getAttribute('data-spec')
    const style = element.getAttribute('data-style') || 'dark'
    const options = JSON.parse(element.getAttribute('data-options') || '{}')
    // get the metrics based on name, granularity, and period
    let renderedData = data.all_metrics.filter(
      (d) =>
        d.name === metric &&
        d.period === app.graphGranularity[period] &&
        new Date(d.end_date) >= graphPeriodStart[period]
    )
    if (metric === 'nft_sales_volume') {
      // in Hbar
      const _htmlSwitch = htmlSwitch || document.getElementById('switch')
      const conversion = !_htmlSwitch.checked ? 1 : rate
      renderedData = renderedData.map((d) => {
        return {
          ...d,
          total: (d.total * conversion) / 1e8,
        }
      })
    }
    const graph = await app[spec]({
      data: spec === 'cohort' ? data.activeNftAccountCohortsPerWeek : renderedData,
      period,
      title,
      style,
      ...options,
    })
    element.innerHTML = ''
    element.appendChild(graph)
  }
  setTimeout(() => window.dispatchEvent(new Event('resize')), 1)
}

/**
 * @param {boolean} inHbar - Whether to render in HBAR
 */
export async function renderSingleMetrics(inHbar = false) {
  const metrics = document.querySelectorAll('.metric')
  for (const element of metrics) {
    const metric = element.id
    const value = data.all_metrics.find((d) => d.name === metric && d.period === 'century')
    const conversion = inHbar ? 1 : rate
    const total = ['nft_market_cap', 'nft_sales_volume'].includes(metric)
      ? ((value.total * conversion) / 1e8).toLocaleString(
          'en-US',
          !inHbar
            ? {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }
            : {minimumFractionDigits: 0, maximumFractionDigits: 0}
        )
      : value.total.toLocaleString('en-US')
    if (metric === 'nft_market_cap' || metric === 'total_nfts' || metric === 'nft_holders') {
      element.innerHTML = Number(total.replace(/[^0-9.-]+/g, ''))
    } else {
      element.innerHTML = total
    }
  }
}
