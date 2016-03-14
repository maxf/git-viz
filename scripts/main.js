(function() {
  var margin = {top: 80, right: 40, bottom: 40, left:40};
  var width = 800, height = 400;
  var numberOfBins = 60;

  var x, xi;

  var timeParse = d3.time.format.utc('%Y-%m-%d %H:%M:%S %Z').parse;

  var timeScale = (minDate, maxDate) =>
    d3.time.scale()
      .domain([minDate, d3.time.day.offset(maxDate, 1)])
      .rangeRound([0, width]);

  var linearScale = (min, max) =>
    d3.scale.linear()
      .domain([min, max])
      .range([height, 0]);

 var logLineRegexp = /^([0-9a-f]{7})\|([^|]+)\|([^|].+)$/;

  function parseCommitLine(text) {
    var fields = text.match(logLineRegexp);
    return timeParse(fields[2]);
  }

  function isValidLogLine(line) {
    return logLineRegexp.test(line);
  }

  var canvas = d3.select('#canvas')
    .append('g')
    .attr('width', width)
    .attr('height', height)
    .translate([margin.left, margin.top]);

  var message = d3.select('#canvas')
    .append('text')
    .attr('x', margin.left).attr('y', margin.top/2);

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
    xi = x.invert;
    var data = d3.layout.histogram()
      .bins(x.ticks(numberOfBins))
      (values);
    var maxCommitsPerBin = Math.max.apply(null, data.map(bin => bin.length));
    var y = linearScale(0, maxCommitsPerBin);
    var barWidth = x(data[0].dx) - x(0) + 1;
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
    .x(d=>x(d.date))
    .y(d=>scale(d[field]))
    .interpolate('basis');

  var dispatch = d3.dispatch('mousemove', 'mouseover', 'mouseout');


  // create a path on the evolution of a field in a dataset
  var drawPath = function(data, fieldName, colour) {
    var id=idFrom(fieldName);
    var y = linearScale(0, maxOf(data, fieldName));
    var path = makeSvgLine(fieldName, y);
    var group = canvas.append('g.path')
      .attr('id', id);
    group.append('path')
      .datum(data)
      .attr('d', path)
      .attr('stroke', colour);
    group.append('text')
      .attr('x', width)
      .attr('y', y(data[data.length-1][fieldName])-5)
      .text(fieldName)
      .attr('fill', colour);
    var cursor = group.append('g').attr('fill', colour).attr('visibility', 'hidden');
    var cursorMarker = cursor.append('circle').attr('r', 5);
    var cursorText = cursor.append('text').translate([5, 15]);

    dispatch.on("mousemove." + id, (xcoord, di) => {
      var ycoord = y(di[fieldName]);
      cursor.translate([xcoord, ycoord]);
      cursorText.text(di[fieldName]);
    });
    dispatch.on("mouseover."+id, () => { cursor.attr('visibility', 'visible') });
    dispatch.on("mouseout."+id, () => { cursor.attr('visibility', 'hidden') });
  };

  var bisectDate = d3.bisector(function(d) { return d.date; }).left;

  var mouseMove = function(data, cursor) {
    return function() {
      var mouseCoords = d3.mouse(this);
      var xCoord = mouseCoords[0];
      var i = bisectDate(data, xi(xCoord));
      cursor
        .attr('x1', xCoord)
        .attr('x2', xCoord);
      message.text(data[i].message);
      dispatch.mousemove(xCoord, data[i]);
    }
  }

  var mouseOver = function(cursor) {
    return function() {
      cursor.attr('visibility', 'visible');
      dispatch.mouseover();
    }
  }

  var mouseOut = function(cursor) {
    return function() {
      cursor.attr('visibility', 'hidden');
      dispatch.mouseout();
    }
  }

  var main = function() {
    d3.text('repo/log.txt', (error, text) => {
      if (error) throw error;
      var values = text
        .split('\n')
        .filter(isValidLogLine)
        .map(parseCommitLine);

      drawBarChart(canvas, values);


      d3.csv('repo/lines.csv', (error, data) => {
        if (error) throw error;

        data = data.map(d => { d.date = timeParse(d.date); return d; });
        data.sort((a,b) => a.date.getTime() - b.date.getTime());

        var cursor = canvas.append('line.cursor').attr('y2', height);

        var pathColours = d3.scale.category10();
        drawPath(data, 'Number of files', pathColours(0));
        drawPath(data, 'Number of lines', pathColours(1));
        drawPath(data, 'Lines per file', pathColours(2));

        // Add an overlay to receive mouse events
        canvas.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('opacity', 0)
            .on('mousemove', mouseMove(data, cursor))
            .on('mouseover', mouseOver(cursor))
            .on('mouseout', mouseOut(cursor));
      });
    });
  }


  main();

}());
