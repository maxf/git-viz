/* global d3, moment */
(function() {

var margin = {top: 40, right: 40, bottom: 40, left:40},
    width = 800, height = 400;

var timeScale = (minDate, maxDate, margin) =>
  d3.time.scale()
    .domain([minDate, d3.time.day.offset(maxDate, 1)])
    .rangeRound([0, width - margin.left - margin.right]);

var timeAxis = (timeScale) =>
  d3.svg.axis()
    .scale(timeScale)
    .orient('bottom')
    .ticks(10)
    .tickFormat(d3.time.format('%m/%Y'))
    .tickSize(10, 0)
    .tickPadding(8);



function groupByWeek(accumulated, commit) {
  if (!accumulated.length) {
    return [{date:commit.date, count:1}];
  }
  var lastAccumulatedDay = accumulated[accumulated.length-1];
  if (lastAccumulatedDay.date.week() === commit.date.week()) {
    accumulated[accumulated.length-1].count++;
    return accumulated;
  } else {
    accumulated.push({date:commit.date, count:1});
  }
  return accumulated;
}

var logLineRegexp = /^([0-9a-f]{7})\|([^|]+)\|([^|].+)$/;

function parseCommitLine(text) {
  var fields = text.match(logLineRegexp);
  return {
    hash: fields[1],
    date: moment(fields[2]),
    comment: fields[3]
  }
}

function isValidLogLine(line) {
  return logLineRegexp.test(line);
}

d3.text('repo/log.txt', (error, text) => {
  var commitsPerWeek = text
    .split('\n')
    .filter(isValidLogLine)
    .map(parseCommitLine)
    .reduce(groupByWeek, [])
  ;

  var minDate = commitsPerWeek[commitsPerWeek.length-1].date;
  var maxDate = commitsPerWeek[0].date;
  var tScale = timeScale(minDate, maxDate, margin);
  var canvas = d3.select('#canvas')
    .append('g')
    .attr('width', width)
    .attr('height', height)
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
  canvas.append('rect')
    .attr('id', 'frame')
    .attr('width', width)
    .attr('height', height)
  ;

  canvas.selectAll('circle')
    .data(commitsPerWeek)
    .enter()
    .append('rect')
      .attr('x', commit => tScale(commit.date))
      .attr('y', commit => height/2 - 5 * commit.count)
      .attr('height', commit => 5 * commit.count)
      .attr('width', 5)
      .attr('fill', 'red')
      .append('title')
        .text(commit => `Week ${commit.date.week()}: ${commit.count} commits.`)
      ;

  canvas.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
    .call(timeAxis(tScale))
  ;

});


}());