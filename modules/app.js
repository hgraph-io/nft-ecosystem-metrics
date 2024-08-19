//https://observablehq.com/@vega/vega-lite-api-v5#standalone_use
// https://vega.github.io/schema/vega-lite/v5.json
export const graphGranularity = {
  day: 'hour',
  week: 'day',
  month: 'day',
  quarter: 'week',
  ytd: 'week',
  year: 'month',
  century: 'month',
}

const vegaLiteTimeUnit = {
  hour: 'binnedhours',
  day: 'monthdate',
  week: 'yearweek',
  month: 'yearmonth',
  quarter: 'yearweek',
  ytd: 'yearweek',
  year: 'year',
  century: 'year',
}

const styles = {
  fontFamily: 'Styrene A Web',
  stroke: 'transparent',
  color: {
    main: '#4a8359',
    hover: '#3ec878',
    text: 'white',
    darkGreen: '#4A8359',
    lightGreen: '#3EC878',
    white: '#FFFFFF',
    black: '#222222',
    darkGrey: '#E0E0E0',
    lightGrey: '#979797',
    lighterGrey: '#494848',
    lightestGrey: '#2E2E2E',
  },
  xAxis: {
    get labelColor() {
      return styles.color.black
    },
    labelFontSize: 12,
    labelFontWeight: 300,
    labelPadding: 15,
    padding: 100,
    position: 0,
    get gridColor() {
      return styles.color.darkGrey
    },
    ticks: false,
    //the axis baseline
    get domainColor() {
      return styles.color.lightGrey
    },
  },
  xAxisDark: {
    get labelColor() {
      return styles.color.white
    },
    labelFontSize: 12,
    labelFontWeight: 300,
    labelPadding: 15,
    padding: 100,
    position: 0,
    get gridColor() {
      return styles.color.lightestGrey
    },
    ticks: false,
    //the axis baseline
    get domainColor() {
      return styles.color.lightGrey
    },
  },
  yAxis: {
    get labelColor() {
      return styles.color.black
    },
    labelFontSize: 12,
    labelFontWeight: 300,
    labelPadding: 15,
    gridColor: 'transparent',
    ticks: false,
    get domainColor() {
      return styles.color.lightGrey
    },
  },
  yAxisDark: {
    get labelColor() {
      return styles.color.white
    },
    labelFontSize: 12,
    labelFontWeight: 300,
    labelPadding: 15,
    gridColor: 'transparent',
    ticks: false,
    get domainColor() {
      return styles.color.lightGrey
    },
  },
}

export async function fetchData() {
  const hg = async (query) => {
    const response = await fetch('https://mainnet.hedera.api.hgraph.dev/v1/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    })

    const json = await response.json()
    return json.data
  }

	const query = `
	query AllMetrics {
  all_metrics: ecosystem_metric(
    where: {name: {_in: ["accounts_associating_nfts", "accounts_creating_nft_collections", "accounts_minting_nfts", "accounts_receiving_nfts", "accounts_sending_nfts", "active_nft_accounts", "active_nft_builder_accounts", "nft_collections_created", "nft_holders", "nft_market_cap", "nft_sales_volume", "nfts_minted", "nfts_transferred", "total_nfts"]}}
  ) {
    name
    period
    end_date
    total
  }
  activeNftAccountCohortsPerWeek: ecosystem_active_nft_account_cohorts {
    cohort
    period
    total
  }
}
`

  const json = await hg(query)
  return json
}

/**
 * Fetches the current exchange rate from the Hedera mirror node
 */
export async function fetchRate() {
  const response = await fetch(
    'https://mainnet-public.mirrornode.hedera.com/api/v1/network/exchangerate',
    {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
      },
    }
  )
  const json = await response.json()

  return json.current_rate.cent_equivalent / json.current_rate.hbar_equivalent / 100
}

/*
 * Build the bar graph
 */
export function bar({data, period, title, style = 'dark'}) {
  // https://observablehq.com/@vega/vega-lite-annotated-time-series?collection=@vega/vega-lite-api
  const hover = vl
    .selectPoint('hover')
    .encodings('x') // limit selection to x-axis value
    .on('mouseover') // select on mouseover events
    .toggle(false) // disable toggle on shift-hover
    .nearest(true) // select data point nearest the cursor

  const barGraph = vl
    .markBar({width: {band: 0.8}})
    .data(data)
    .title({
      text: title,
      dy: -30,
      fontSize: 18,
      color: style === 'dark' ? styles.color.white : styles.color.black,
    })
    .encode(
      vl
        .x()
        .timeUnit(vegaLiteTimeUnit[graphGranularity[period]])
        .field('end_date')
        .bandPosition(0)
        .axis(style === 'dark' ? styles.xAxisDark : styles.xAxis)
        .title(null),
      vl
        .y()
        .fieldQ('total')
        .title(null)
        .axis(style === 'dark' ? styles.yAxisDark : styles.yAxis), //https://vega.github.io/vega-lite/docs/axis.html
      vl
        .color()
        .if(hover.empty(true), {
          value: style === 'dark' ? styles.color.lightGreen : styles.color.darkGreen,
        })
        .value(style === 'dark' ? styles.color.darkGreen : styles.color.lightGreen)
    )

  const bubble = vl.layer(
    barGraph
      .markRect({
        width: 150,
        height: 50,
        cornerRadius: 30,
        yOffset: -32,
        fill: style === 'dark' ? styles.color.black : styles.color.white,
        stroke: style === 'dark' ? styles.color.lightGrey : styles.color.black,
      })
      .transform(vl.filter(hover.empty(false))),
    barGraph
      // hidden anchor point used as reference for selection
      .markCircle()
      .params(hover)
      .encode(vl.opacity().value(0)),
    // little circle on top of bar
    barGraph
      .markCircle({
        fill: style === 'dark' ? styles.color.white : styles.color.black,
        size: 30,
      })
      .transform(vl.filter(hover.empty(false)))
      .encode(vl.opacity().value(100)),
    // total on hover
    barGraph
      .markText(
        {align: 'center', dy: -42},
        {stroke: styles.color.lightGreen, strokeWidth: 1},
        {fontSize: 13, fontWeight: 300}
      )
      .transform([
        vl.filter(hover.empty(false)),
        {calculate: "format(datum.total, ',d')", as: 'formattedTotal'},
      ])
      .encode(vl.text().field('formattedTotal')),
    // date on hover
    barGraph
      .markText(
        {align: 'center', dy: -25},
        {
          stroke: style === 'dark' ? styles.color.white : styles.color.black,
          strokeWidth: 1,
        },
        {fontSize: 15, fontWeight: 100}
      )
      .transform(vl.filter(hover.empty(false)))
      .encode(vl.text().field('end_date').timeUnit(vegaLiteTimeUnit[graphGranularity[period]]))
  )

  return vl
    .layer(barGraph, bubble)
    .width('container')
    .height(290)
    .autosize({type: 'fit-x', resize: false, contains: 'padding'})
    .background('transparent')
    .config({
      font: styles.fontFamily,
      view: {stroke: styles.stroke},
    })
    .render()
}

/*
 * Build the line graph
 */
export function line({data, period, title, cumulative = false, style = 'dark'}) {
  const line = vl
    .markLine({
      interpolate: 'monotone',
      point: false,
      strokeWidth: 3,
    })
    .data(data)
    .transform(
      cumulative ? [vl.window(vl.sum('total').as('cumulative')).sort(vl.field('end_date'))] : []
    )
    .title({
      text: title,
      dy: -30,
      fontSize: 18,
      color: style === 'dark' ? styles.color.white : styles.color.black,
    })
    .encode(
      vl
        .x()
        .field('end_date')
        .timeUnit(vegaLiteTimeUnit[graphGranularity[period]])
        // .fieldT('end_date')
        .title(null)
        .axis(style === 'dark' ? styles.xAxisDark : styles.xAxis),
      vl
        .y()
        .fieldQ(cumulative ? 'cumulative' : 'total')
        .title(null)
        .axis(style === 'dark' ? styles.yAxisDark : styles.yAxis),
      vl.color().value(styles.color.lightGreen)
    )

  // https://observablehq.com/@vega/vega-lite-annotated-time-series?collection=@vega/vega-lite-api
  // select a point for which to provide details-on-demand
  const hover = vl
    .selectPoint('hover')
    .encodings('x') // limit selection to x-axis value
    .on('mouseover') // select on mouseover events
    .toggle(false) // disable toggle on shift-hover
    .nearest(true) // select data point nearest the cursor

  const bubble = vl.layer(
    // count on hover
    line
      .markRect({
        width: 150,
        height: 40,
        cornerRadius: 30,
        yOffset: -32,
        fill: style === 'dark' ? styles.color.black : styles.color.white,
        stroke: style === 'dark' ? styles.color.lightestGrey : styles.color.black,
      })
      .encode(vl.opacity().if(hover.empty(false), vl.value(1)).value(0)),
    // little circle on top of bar
    line
      .markCircle({fill: style === 'dark' ? styles.color.white : styles.color.black, size: 30})
      .params(hover)
      .encode(vl.opacity().if(hover.empty(false), vl.value(1)).value(0)),
    line
      .markText(
        {align: 'center', dx: 0, dy: -30},
        {stroke: styles.color.white, strokeWidth: 1},
        {fontSize: 15, fontWeight: 300}
      )
      .encode([
        vl.opacity().if(hover.empty(false), vl.value(1)).value(0),
        vl.text({
          field: cumulative ? 'cumulative' : 'total',
          format: ',d',
        }),
      ])
  )

  return vl
    .layer(line, bubble)
    .width('container')
    .height(290)
    .autosize({type: 'fit-x', resize: false, contains: 'padding'})
    .background('transparent')
    .config({font: styles.fontFamily, view: {stroke: styles.stroke}}) // font family and view border
    .render()
}

/*
 * Build the cohort grid
 */
export function cohort({data, title}) {
  const csv = data.map(({cohort, period, total}) => ({
    cohort_date: new Date(cohort),
    period_date: new Date(period),
    users: total,
  }))

  const processedData = processCohortData(csv)

  return CohortGrid(processedData)
}

/*
 * Data validation and preprocessing
 * Used to prepare data for visualization with the cohort grid component.
 */
const dateMismatch = function (data) {
  const cohortDates = new d3.InternSet(data.map((d) => d.cohort_date))
  const periodDates = new d3.InternSet(data.map((d) => d.period_date))
  return !(
    cohortDates.size === periodDates.size &&
    Array.from(cohortDates).every((d) => periodDates.has(d))
  )
}

const validationRules = {
  dataRules: [dateMismatch || 'Dates in cohort_date and period_date columns should match'],
  columnRules: {
    cohort_date: (d) => d instanceof Date || 'column should be of type Date, like YYYY-MM-DD',
    period_date: (d) => d instanceof Date || 'column should be of type Date, like YYYY-MM-DD',
    users: (d) => typeof d === 'number' || 'should be a number',
  },
}

const processCohortData = function (data) {
  if (data[0].segment) {
    const segments = Array.from(new Set(data.map((d) => d.segment)))
    return segments.flatMap((segment) =>
      processSegment(data.filter((d) => d.segment === segment)).map((d) => ({...d, segment}))
    )
  } else {
    return processSegment(data)
  }
}

const processSegment = function (segmentData) {
  const selectedSegment = segmentData.sort(
    (a, b) =>
      d3.ascending(a.cohort_date, b.cohort_date) || d3.ascending(a.period_date, b.period_date)
  )
  const userCounts = d3.rollup(
    selectedSegment,
    ([{users}]) => users,
    (d) => d.cohort_date
  )
  const cohortDates = new d3.InternSet(selectedSegment.map((d) => d.cohort_date))
  const periodDates = new d3.InternSet(selectedSegment.map((d) => d.period_date))
  const cohortDatesArray = Array.from(cohortDates).map((d) => +d)

  // Make sure we have a user count for every combination of cohort date and period date, and calculate
  // period numbers and percentages for each entry.
  const cross = d3
    .cross(cohortDates, periodDates, (cohort_date, period_date) => ({cohort_date, period_date}))
    .filter(({cohort_date, period_date}) => cohort_date <= period_date)
  const rollup = d3.rollup(
    selectedSegment,
    ([{users}]) => users,
    (d) => d.cohort_date,
    (d) => d.period_date
  )
  const data = cross
    .map(({cohort_date, period_date}) => {
      const period_number =
        cohortDatesArray.indexOf(+period_date) - cohortDatesArray.indexOf(+cohort_date)
      const users =
        rollup.has(cohort_date) && rollup.get(cohort_date).has(period_date)
          ? rollup.get(cohort_date).get(period_date)
          : 0
      const percentage = users / userCounts.get(cohort_date)
      return {cohort_date, period_date, period_number, users, percentage}
    })
    .filter((d) => d.period_number >= 0)

  return data.sort(
    (a, b) =>
      d3.ascending(a.cohort_date, b.cohort_date) || d3.ascending(a.period_date, b.period_date)
  )
}

const CohortGrid = function (
  data,
  {
    gridWidth = 1000,
    gridHeight = gridWidth * 0.88,
    dateFormat = d3.utcFormat('%b %d, %Y'),
    leftMargin = 165,
    maxCohorts = 15,
  } = {}
) {
  const allCohorts = Array.from(new d3.InternSet(data.map((d) => d.cohort_date))).sort(
    d3.descending
  )
  const visibleCohorts = new d3.InternMap(
    allCohorts.slice(0, maxCohorts + 1).map((d) => [d, true])
  )
  const visibleData = data.filter((d) => visibleCohorts.has(d.cohort_date))

  const userCounts = new d3.InternMap(
    visibleData
      .filter((d) => d.period_number === 0)
      .map(({cohort_date, users}) => [cohort_date, users])
  )
  const retentionCohorts = visibleData.filter((d) => d.period_number > 0)

  const cohortDates = Array.from(
    new d3.InternSet(retentionCohorts.map((d) => d.cohort_date))
  ).sort(d3.ascending)
  const periodNumbers = Array.from(new Set(retentionCohorts.map((d) => d.period_number))).sort(
    d3.ascending
  )

  const margin = {top: 55, right: 10, bottom: 0, left: leftMargin}

  const x = d3
    .scaleBand()
    .domain(periodNumbers)
    .rangeRound([margin.left + 6, gridWidth - margin.right])
    .padding(0.1) // Adjust the padding between bands

  const y = d3
    .scaleBand()
    .domain(cohortDates)
    .rangeRound([margin.top, gridHeight - margin.bottom])
    .padding(0.1) // Adjust the padding between bands

  const color = d3
    .scaleSequential(d3.interpolateYlGnBu)
    .domain([0, d3.max(retentionCohorts, (d) => d.percentage)])

  const label = (d) => d3.format('.1%')(d.percentage)

  // Put inside a div to enable horizontal scrolling on a small screen
  const div = d3
    .create('div')
    .style('overflow-x', 'auto')
    .style('font-variant-numeric', 'tabular-nums')

  const svg = div
    .append('svg')
    .attr('viewBox', [0, 0, gridWidth, gridHeight])
    .attr('width', gridWidth)

  const element = div.node()
  element.value = null

  const g = svg.append('g').attr('shape-rendering', 'crispEdges').style('cursor', 'default')

  const row = g
    .selectAll('.row')
    .data(d3.groups(retentionCohorts, (d) => d.cohort_date))
    .join('g')
    .attr('class', 'row')
    .attr('transform', ([cohort_date, _]) => `translate(0,${y(cohort_date)})`)

  const cell = row
    .selectAll('.cell')
    .data(([_, values]) => values)
    .join('g')
    .attr('class', 'cell')
    .attr('transform', (d) => `translate(${x(d.period_number)},0)`)

  cell
    .append('rect')
    .attr('fill', (d) => {
      let adjustedOpacity = 0.3 + d.percentage
      if (adjustedOpacity > 0.6) {
        adjustedOpacity = 0.6
      }
      return d3.rgb(color(d.percentage)).copy({opacity: adjustedOpacity})
    })
    .style('outline-color', (d) => {
      let adjustedOpacity = 0.6 + d.percentage
      if (adjustedOpacity > 0.8) {
        adjustedOpacity = 0.8
      }
      return d3.rgb(color(d.percentage)).copy({opacity: adjustedOpacity})
    })
    .style('outline-style', 'solid')
    .style('outline-width', '3px')
    .style('outline-offset', '-3px')
    .attr('data-per', (d) => d.percentage)
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())

  cell
    .append('text')
    .text(label)
    .attr('fill', 'white')
    .attr('x', x.bandwidth() / 2 + 1)
    .attr('y', y.bandwidth() / 2)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('font-size', '10px')
    .attr('font-family', styles.fontFamily)

  cell.append('title').text((d) => `${dateFormat(d.period_date)}`)

  // Column labels
  const xAxis = d3.axisTop(x).tickFormat((d) => 'Week ' + d) // Add "Prefix " before each tick value

  svg
    .append('g')
    .attr('transform', `translate(0,${margin.top})`)
    .call(xAxis)
    .call((g) => g.selectAll('.domain, .tick line').remove())
    .call((g) =>
      g
        .selectAll('text')
        .style('text-anchor', 'start')
        .attr('font-family', styles.fontFamily)
        .attr('font-size', '12px')
        .attr('fill', styles.color.white)
        .attr('transform', 'rotate(-45)')
        .attr('dx', '5px')
    )

  // Row labels
  const rowLabel = row
    .append('g')
    .attr('font-size', '12px')
    .attr('font-family', styles.fontFamily)
    .attr('fill', styles.color.white)

  rowLabel
    .append('text')
    .text(([cohort_date, _]) => dateFormat(cohort_date))
    .attr('x', 2)
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.35em')

  rowLabel
    .append('text')
    .text(([cohort_date, _]) => d3.format(',')(userCounts.get(cohort_date)))
    .attr('x', margin.left - 7)
    .attr('y', y.bandwidth() / 2)
    .attr('text-anchor', 'end')
    .attr('dy', '0.35em')

  return element
}
