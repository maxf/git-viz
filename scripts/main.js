(function() {
  const margin = {top: 80, right: 40, bottom: 40, left:40};
  const width = 800, height = 400;
  const numberOfBins = 60;
  const timeParse = d3.time.format.utc('%Y-%m-%d %H:%M:%S %Z').parse;
  const timeScale = (minDate, maxDate) =>
    d3.time.scale()
      .domain([minDate, d3.time.day.offset(maxDate, 1)])
      .rangeRound([0, width]);
  const linearScale = (dmin, dmax, rmin, rmax) =>
    d3.scale.linear()
      .domain([dmin, dmax])
      .range([rmin, rmax]);

//  const RD = new RepositoryData();

  const canvas = d3.select('#canvas')
    .append('g')
    .attr('width', width)
    .attr('height', height)
    .translate([margin.left, margin.top]);

  const message = d3.select('#canvas')
    .append('text')
    .attr('x', margin.left).attr('y', margin.top/2);


  const drawAxes = (xScale, yScale, canvas, height, xLabel, yLabel) => {

    const xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .tickFormat(d3.time.format('%Y-%m'));

    const yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .ticks(10);

    const svgXAxis = canvas.append('g.axis')
      .translate([0, height])
      .call(xAxis);

    svgXAxis.selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '-.55em')
        .attr('transform', 'rotate(-90)' );

    if (yLabel) {
      svgXAxis.append('text')
        .attr('x', 10).attr('y', -2)
        .text(yLabel);
    }

    const svgYAxis = canvas.append('g.axis')
      .call(yAxis);

    if (yLabel) {
      svgYAxis.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text(xLabel);
    }
  };


  const drawBarChart = (canvas, x, values, height) => {
    const data = d3.layout.histogram()
      .bins(x.ticks(numberOfBins))
      (values);
    const maxCommitsPerBin = Math.max.apply(null, data.map(bin => bin.length));
    const y = linearScale(0, maxCommitsPerBin, height, 0);
    const barWidth = x(data[0].dx) - x(0) + 1;
    const barWidthInDays = data[0].dx / 86400000;
    const bar = canvas.selectAll('.bar')
      .data(data)
      .enter()
      .append('g.bar')
        .translate(d => [x(d.x), y(d.y)]);
    bar.append('rect')
      .attr('x', 1)
      .attr('width', barWidth)
      .attr('height', d => height - y(d.y));
    drawAxes(x, y, canvas, height, 'commits', `bar width: ${barWidthInDays.toFixed()} days`);
  }


  // make an identifier from any string
  const idFrom = str => str.replace(/[^\w]/g, '_').toLowerCase();

  // Functions to get the min or max of a specific field of an array of objects
  const minMax = (fun) => (array, field) => fun.apply(null, array.map(d=>d[field]));
  const maxOf = minMax(Math.max);
  const minOf = minMax(Math.min);



  // generator of the d attribute of a <path>
  const makeSvgLine = (field, scale, x) => d3.svg.line()
    .x(d=>x(d.date))
    .y(d=>scale(d[field]))
    .interpolate('step-before');

  const dispatch = d3.dispatch('mousemove', 'mouseover', 'mouseout');


  // create a path on the evolution of a field in a dataset
  const drawPath = (data, fieldName, colour, ymin, ymax, x) => {
    const id=idFrom(fieldName);
    const y = linearScale(minOf(data, fieldName), maxOf(data, fieldName), ymin, ymax);
    const path = makeSvgLine(fieldName, y, x);
    const group = canvas.append('g.path')
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
    const cursor = group.append('g').attr('fill', colour).attr('visibility', 'hidden');
    const cursorMarker = cursor.append('circle').attr('r', 5);
    const cursorText = cursor.append('text').translate([5, 15]);

    dispatch.on("mousemove." + id, (xcoord, di) => {
      const ycoord = y(di[fieldName]);
      cursor.translate([xcoord, ycoord]);
      cursorText.text(di[fieldName]);
    });
    dispatch.on("mouseover."+id, () => { cursor.attr('visibility', 'visible') });
    dispatch.on("mouseout."+id, () => { cursor.attr('visibility', 'hidden') });
  };

  const bisectDate = d3.bisector(function(d) { return d.date; }).left;

  const mouseMove = (data, xi, cursor, eventZone) =>
    () => {
      var mouseCoords = d3.mouse(eventZone[0][0]); // FIXME
      var xCoord = mouseCoords[0];
      var i = bisectDate(data, xi(xCoord));
      cursor
        .attr('x1', xCoord)
        .attr('x2', xCoord);
      message.text(data[i].message);
      dispatch.mousemove(xCoord, data[i]);
    };


  const mouseOver = cursor =>
    () => {
      cursor.attr('visibility', 'visible');
      dispatch.mouseover();
    };


  const mouseOut = cursor =>
    () => {
      cursor.attr('visibility', 'hidden');
      dispatch.mouseout();
    };

  const drawStacked = (data, max, colours, ymin, ymax, x) => {
    for (let i=0; i<=max; i++) {
      let label = Object.keys(data[0]).find(e => e.startsWith(i+' - '));
      let lang = label.replace(/^\d+ - /, '');
      drawPath(data, label, colours(i), ymin, ymax, x);
    }
  }


  const main = () => {

    d3.csv('repo/lines.csv', (error, data) => {
      if (error) throw error;
      data = data.map(d => { d.date = timeParse(d.date); return d; });
      data.sort((a,b) => a.date.getTime() - b.date.getTime());

      const dates = data.map(line => line.date);
      const startTime = dates[0];
      const endTime = dates[dates.length-1];
      const x = timeScale(startTime, endTime);
      const xi = x.invert;
      drawBarChart(canvas, x, dates, height);

      const cursor = canvas.append('line.cursor').attr('y2', height);

      const pathColours = d3.scale.category10();
      drawPath(data, 'Number of files', pathColours(0), 100,   0, x);
      drawPath(data, 'Number of lines', pathColours(1), 250, 150, x);


      drawStacked(data, 4, pathColours, 400, 300, x);

      // Add an overlay to receive mouse events
      eventZone = canvas.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('opacity', 0);
      eventZone
        .on('mousemove', mouseMove(data, xi, cursor, eventZone))
        .on('mouseover', mouseOver(cursor))
        .on('mouseout', mouseOut(cursor));
    });
  }


  main();

}());
