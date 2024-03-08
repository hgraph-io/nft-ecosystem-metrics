import {renderGraphs, renderSingleMetrics} from './modules/ui.js'

// render when select menus change
document.querySelectorAll('select').forEach((e) => {
  e.onchange = (e) => {
    renderGraphs(e.target)
  }
})

// switch between USD and HBAR
document.getElementById('switch').onchange = (e) => {
  renderSingleMetrics(!e.target.checked)
  renderGraphs(e.target)
}

// see if DOM is already available then render inital state
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(renderGraphs, 1)
  setTimeout(renderSingleMetrics, 1)
} else {
  document.addEventListener('DOMContentLoaded', renderGraphs)
  document.addEventListener('DOMContentLoaded', renderSingleMetrics)
}

document.addEventListener('resize', renderGraphs)
document.addEventListener('resize', renderSingleMetrics)
