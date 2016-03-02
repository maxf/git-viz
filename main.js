/* global d3, moment */
(function() {

var margin = {top: 40, right: 40, bottom: 40, left:40};
var width = 800, height = 400;

var timeScale = (minDate, maxDate) =>
  d3.time.scale()
    .domain([minDate, d3.time.day.offset(maxDate, 1)])
    .rangeRound([0, width - margin.left - margin.right]);

var logLineRegexp = /^([0-9a-f]{7})\|([^|]+)\|([^|].+)$/;

function parseCommitLine(text) {
  var fields = text.match(logLineRegexp);
  return d3.time.format.iso.parse(fields[2]);
}

function isValidLogLine(line) {
  return logLineRegexp.test(line);
}

var canvas = d3.select('#canvas')
  .append('g')
  .attr('width', width)
  .attr('height', height)
  .attr('transform', `translate(${margin.left}, ${margin.top})`);
canvas.append('rect')
  .attr('id', 'frame')
  .attr('width', width)
  .attr('height', height);



function drawAxes(xScale, yScale, canvas, height) {

  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom")
    .tickFormat(d3.time.format("%Y-%m"));

  var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left")
    .ticks(10);

  canvas.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", "-.55em")
      .attr("transform", "rotate(-90)" );

  canvas.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text('commits');
}

function drawBarChart(canvas, values) {
  var startTime = values[values.length - 1];
  var endTime = values[0];
  var x = timeScale(startTime, endTime);
  var data = d3.layout.histogram()
    .bins(x.ticks(20))
    (values);
  var maxCommitsPerBin = Math.max.apply(null, data.map(bin => bin.length));
  var y = d3.scale.linear()
    .domain([0, maxCommitsPerBin])
    .range([height, 0]);
  var barWidth = x(startTime.getMilliseconds() + data[0].dx)
               - x(startTime.getMilliseconds())
               + 1;
  var bar = canvas.selectAll('.bar')
    .data(data)
    .enter()
    .append('g').attr('class', 'bar')
      .attr('transform', d => `translate(${x(d.x)}, ${y(d.y)})`)
      .attr('fill', 'red')
  bar.append('rect')
    .attr('x', 1)
    .attr('width', barWidth)
    .attr('height', d => height - y(d.y));
  drawAxes(x, y, canvas, height);
}

d3.text('repo/log.txt', (error, text) => {
  if (error) throw error;
  var values = text
    .split('\n')
    .filter(isValidLogLine)
    .map(parseCommitLine);
  drawBarChart(canvas, values);
});


}());