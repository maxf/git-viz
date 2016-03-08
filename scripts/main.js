require(['ramda', 'd3', 'd3-jetpack'], function(_, d3) {

  var margin = {top: 40, right: 40, bottom: 40, left:40};
  var width = 800, height = 400;
  var numberOfBins = 60;

  var x;

  var timeScale = (minDate, maxDate) =>
    d3.time.scale()
      .domain([minDate, d3.time.day.offset(maxDate, 1)])
      .rangeRound([0, width - margin.left - margin.right]);

  var linearScale = (min, max) =>
      d3.scale.linear()
        .domain([min, max])
        .range([height, 0]);

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
    .translate([margin.left, margin.top]);
  canvas.append('rect')
      .attr('id', 'frame')
      .attr('width', width)
      .attr('height', height);

  function drawAxes(xScale, yScale, canvas, height) {

    var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .tickFormat(d3.time.format('%Y-%m'));

    var yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .ticks(10);

    canvas.append('g.axis')
        .translate([0, height])
        .call(xAxis)
      .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '-.55em')
        .attr('transform', 'rotate(-90)' );

    canvas.append('g.axis')
        .call(yAxis)
      .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text('commits');
  }

  function drawBarChart(canvas, values) {
    var startTime = values[values.length - 1];
    var endTime = values[0];
    x = timeScale(startTime, endTime);
    var data = d3.layout.histogram()
      .bins(x.ticks(numberOfBins))
      (values);
    var maxCommitsPerBin = Math.max.apply(null, data.map(bin => bin.length));
    var y = linearScale(0, maxCommitsPerBin);
    var barWidth = x(data[0].dx) - x(0) + 1;
    //    var barWidth = 1 + (x(endTime.getTime()) - x(startTime.getTime())) / (numberOfBins * 2);
    var bar = canvas.selectAll('.bar')
      .data(data)
      .enter()
      .append('g.bar')
        .translate(d => [x(d.x), y(d.y)]);
    bar.append('rect')
      .attr('x', 1)
      .attr('width', barWidth)
      .attr('height', d => height - y(d.y));
    drawAxes(x, y, canvas, height);
  }


  // make an identifier from any string
  var idFrom = str => str.replace(/[^\w]/g, '_').toLowerCase();

  // Functions to get the min or max of a specific field of an array of objects
  var minMax = (fun) => (array, field) => fun.apply(null, array.map(d=>d[field]));
  var maxOf = minMax(Math.max);
  // var minOf = minMax(Math.min);

  // generator of the d attribute of a <path>
  var makeSvgLine = (field, scale) => d3.svg.line()
    .x(d=>x(d3.time.format.iso.parse(d.date)))
    .y(d=>scale(d[field]))
    .interpolate('basis');

  // create a path on the evolution of a field in a dataset
  var drawPath = function(data, fieldName, colour) {
    var y = linearScale(0, maxOf(data, fieldName));
    var path = makeSvgLine(fieldName, y);
    var group = canvas.append('g.path')
      .attr('id', idFrom(fieldName));
    group.append('path')
      .datum(data)
      .attr('d', path)
      .attr('stroke', colour);
    group.append('text')
      .attr('x', width-margin.left-margin.right)
      .attr('y', y(data[0][fieldName])-5)
      .text(fieldName)
      .attr('fill', colour);
  };


  // Start reading the files

  d3.text('repo/log.txt', (error, text) => {
    if (error) throw error;
    var values = text
      .split('\n')
      .filter(isValidLogLine)
      .map(parseCommitLine);

    drawBarChart(canvas, values);

    d3.csv('repo/lines.csv', (error, data) => {
      if (error) throw error;
      var pathColours = d3.scale.category10();
      drawPath(data, 'Number of files', pathColours(0));
      drawPath(data, 'Number of lines', pathColours(1));
      drawPath(data, 'Lines per file', pathColours(2));
    });
  });
});
