//https://observablehq.com/@vega/vega-lite-api-v5#standalone_use
// https://vega.github.io/schema/vega-lite/v5.json
const vegaLiteTimeUnit = {
  day: 'yearmonthdate',
  week: 'yearweek',
  month: 'yearmonth',
  quarter: 'yearquarter',
  year: 'year',
}

const styles = {
  color: {
    main: '#4a8359',
    hover: '#3ec878',
    text: 'white',
    darkGreen: '#4A8359',
    lightGreen: '#3EC878',
    white: '#FFFFFF',
    black: '#222222',
    darkGrey: '#393939',
    lightGrey: '#979797',
    lighterGrey: '#eaeaea',
  },
}

export async function fetchData() {
  const hg = async (query) => {
    const response = await fetch('https://testnet.hedera.api.hgraph.dev/v1/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    })

    const json = await response.json()
    console.log(json)
    return json.data
  }

  const query = `query AllMetrics {
  all_metrics: ecosystem_metric {
    name
    period
    start_date
    end_date
    total
  }
}`

  const json = await hg(query)
  console.log(json)
  return json
}

export function bar({data, period, title, style = 'dark'}) {
  // https://observablehq.com/@vega/vega-lite-annotated-time-series?collection=@vega/vega-lite-api
  const hover = vl
    .selectPoint('hover')
    .encodings('x') // limit selection to x-axis value
    .on('mouseover') // select on mouseover events
    .toggle(false) // disable toggle on shift-hover
    .nearest(true) // select data point nearest the cursor

  const barGraph = vl
    .markBar({width: {band: 0.6}})
    .data(data)
    .title({text: title, color: style === 'dark' ? styles.color.white : styles.color.black})
    .encode(
      vl
        .x()
        .timeUnit(vegaLiteTimeUnit[period])
        .field('end_date')
        .bandPosition(0.5)
        .axis({
          labelColor: style === 'dark' ? styles.color.white : styles.color.black,
          labelFontSize: 12,
          labelFontWeight: 300,
          labelPadding: 15,
          padding: 100,
          position: 0,
          gridColor: style === 'dark' ? styles.color.darkGrey : styles.color.lighterGrey,
          ticks: false,
          domainColor: styles.color.lightGrey,
        })
        .title(null),
      vl
        .y()
        .fieldQ('total')
        .title(null)
        .axis({
          labelColor: style === 'dark' ? styles.color.white : styles.color.black,
          labelFontSize: 12,
          labelFontWeight: 300,
          labelPadding: 15,
          gridColor: 'transparent',
          ticks: false,
          domainColor: styles.color.lightGrey,
        }), //https://vega.github.io/vega-lite/docs/axis.html
      vl
        .color()
        .if(hover.empty(true), {
          value: style === 'dark' ? styles.color.lightGreen : styles.color.darkGreen,
        })
        .value(style === 'dark' ? styles.color.darkGreen : styles.color.lightGreen)
    )

  const bubble = vl.layer(
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
      .encode(vl.text().field('end_date').timeUnit(vegaLiteTimeUnit[period]))
  )

  return vl
    .layer(barGraph, bubble)
    .width('container')
    .autosize({type: 'fit-x', resize: true, contains: 'padding'})
    .background('transparent')
    .config({
      font: 'Styrene A Web',
      view: {stroke: 'transparent'},
    }) // font family and view border
    .render()
}
