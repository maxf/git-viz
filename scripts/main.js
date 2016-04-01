(function() {
  'use strict';
  const timeParse = d3.time.format.utc('%Y-%m-%d %H:%M:%S %Z').parse;

  //TODO: use d3.extent
  const timeScale = (minDate, maxDate, width) =>
    d3.time.scale()
      .domain([minDate, d3.time.day.offset(maxDate, 1)])
      .rangeRound([0, width]);
  const linearScale = (dmin, dmax, rmin, rmax) =>
    d3.scale.linear()
      .domain([dmin, dmax])
      .range([rmin, rmax]);

  //==========================================================================

  const drawYaxis = (ctx, yScale, yLabel) => {
    const yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .ticks(4);

    const svgYAxis = ctx.canvas.append('g.axis')
      .call(yAxis);

    if (yLabel) {
      const yPos = yScale.range()[1];
      svgYAxis.append('text')
        .attr('transform', `translate(0, ${yPos}) rotate(-90)`)
        .attr('y', -60)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text(yLabel);
    }
  }

  //==========================================================================

  const drawXaxis = (ctx, xScale, xLabel, height) => {
    const xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .tickFormat(d3.time.format('%Y-%m'));

    const svgXAxis = ctx.canvas.append('g.axis')
      .translate([0, height])
      .call(xAxis);

    svgXAxis.selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '-.55em')
        .attr('transform', 'rotate(-45)' );

    if (xLabel) {
      svgXAxis.append('text')
        .attr('x', 10).attr('y', -2)
        .text(xLabel);
    }
  }

  //==========================================================================

  const drawBarChart = (commits, ctx, x, settings, min, max) => {
    const values = commits.map(line => line.date);

    const data = d3.layout.histogram()
      .bins(x.ticks(settings.numberOfBins))
      (values);
    console.log(data)
    const maxCommitsPerBin = Math.max.apply(null, data.map(bin => bin.length));
    const y = linearScale(0, maxCommitsPerBin, max - min, 0);
    const barWidth = x(data[0].dx) - x(0) + 1;
    const barWidthInDays = data[0].dx / 86400000;
    const bar = ctx.canvas.selectAll('.bar')
      .data(data)
      .enter()
      .append('g.bar')
        .translate(d => [x(d.x), y(d.y)]);
    bar.append('rect')
      .attr('x', 1)
      .attr('width', barWidth)
      .attr('height', d => max - min - y(d.y));

    drawXaxis(ctx, x, '', max-min)
    drawYaxis(ctx, y, `Commits / ${barWidthInDays.toFixed()} days`);

  }

  //==========================================================================

  // make an identifier from any string
  const idFrom = str => str.replace(/[^\w]/g, '_').toLowerCase();

  // Functions to get the min or max of a specific field of an array of objects
  const minMax = (fun) => (array, field) => fun.apply(null, array.map(d=>d[field]));
  const maxOf = minMax(Math.max);
  const minOf = minMax(Math.min);

  // generator of the d attribute of a <path>
  const makeSvgLinePath = (field, scale, x) => d3.svg.line()
    .x(d=>x(d.date))
    .y(d=>scale(d[field]))
    .interpolate('step-before');

  const dispatch = d3.dispatch('mousemove', 'mouseover', 'mouseout');

  //==========================================================================

  // create a path on the evolution of a field in a dataset
  const drawPath = (data, ctx, fieldName, colourIndex, ymin, ymax, x, settings, dispatch) => {
    const id = idFrom(fieldName);
    const y = linearScale(0, maxOf(data, fieldName), ymin, ymax);
    const path = makeSvgLinePath(fieldName, y, x);
    const colour = ctx.colours(colourIndex);
    //const background = ctx.canvas.append('g.background')
    const group = ctx.canvas.append('g.path')
      .attr('id', id);
    group.append('rect')
      .attr('x', 0).attr('y', ymax)
      .attr('width', settings.width).attr('height', ymin-ymax)
      .style('fill', colour)
      .style('opacity', .2);
    group.append('path')
      .datum(data)
      .attr('d', path)
      .attr('stroke', colour);
    group.append('text')
      .attr('x', settings.width + 2)
      .attr('y', y(data[data.length-1][fieldName])-5)
      .text(fieldName)
      .attr('fill', colour);
    const cursor = group.append('g').attr('fill', colour).attr('visibility', 'hidden');
    const cursorMarker = cursor.append('circle').attr('r', 5);
    const cursorText = cursor.append('text').translate([5, 15]);

    drawYaxis(ctx, y, fieldName);


    dispatch.on('mousemove.' + id, (xcoord, di) => {
      const ycoord = y(di[fieldName]);
      cursor.translate([xcoord, ycoord]);
      cursorText.text(di[fieldName]);
    });
    dispatch.on('mouseover.'+id, () => { cursor.attr('visibility', 'visible') });
    dispatch.on('mouseout.'+id, () => { cursor.attr('visibility', 'hidden') });
  };

  const bisectDate = d3.bisector(function(d) { return d.date; }).left;

  const mouseMove = (data, xi, ctx, dispatch) =>
    () => {
      var mouseCoords = d3.mouse(ctx.eventZone.node());
      var xCoord = mouseCoords[0];
      var i = bisectDate(data, xi(xCoord));
      ctx.cursor
        .attr('x1', xCoord)
        .attr('x2', xCoord);
      ctx.message.text(data[i].message);
      dispatch.mousemove(xCoord, data[i]);
    };

  const mouseOver = (ctx, dispatch) =>
    () => {
      ctx.cursor.attr('visibility', 'visible');
      dispatch.mouseover();
    };

  const mouseOut = (ctx, dispatch) =>
    () => {
      ctx.cursor.attr('visibility', 'hidden');
      dispatch.mouseout();
    };


  //==========================================================================

  // commits: array of { 'date', ^\d+ - ' }
  // keysToKeep: array of keys to include in results
  // All other keys will be summed up into '∞ - other'
  // 'date' will be copied as is
  const collapseRest = (commits, keysToKeep) => {
    return commits.map(commit => {
      const newCommit = { date: commit.date };
      const commitKeys = Object.keys(commit);
      let sum = 0;
      for (let key of commitKeys) {
        if (key !== 'date') {
          if (keysToKeep.indexOf(key) === -1) {
            sum += +commit[key];
          } else {
            newCommit[key] = +commit[key];
          }
        }
      }
      newCommit['∞ - other'] = sum;
      return newCommit;
    });
  }


  //==========================================================================

  const drawStack = (data, ctx, max, ymin, ymax, x, settings, dispatch) => {
  // TODO: calculate max so that only the languages adding more than 90% are shown
    const y = d3.scale.linear()
      .range([ymin, ymax])
      .domain([0, 2000]);

    // remove data we don't need
    const isKeyForStack = (keyVal, keyName) => keyName === 'date' || /^\d+ - /.test(keyName);
    const dataToKeep = data.map(datum => R.pickBy(isKeyForStack, datum));

    // collapse the numbers of columns of the form '[number] - ' where number >= max
    const keysToKeep = Object.keys(data[0]).filter(key => /^\d+ - /.test(key)).splice(0, max);
    const stackData = collapseRest(dataToKeep, keysToKeep);

    var area = d3.svg.area()
      .x(d => x(d.date))
      .y0(d => y(d.y0))
      .y1(d => y(d.y0 + d.y));

    var keysToDisplay = R.append('∞ - other', keysToKeep);
    let colour = d3.scale.category20b()
      .domain(keysToKeep);

    var stack = d3.layout.stack()
      .values(d => d.values);

    var layout = stack(keysToDisplay.map(name => {
      return { name: name, values: stackData.map(d => {
        return { date: d.date, y: d[name] };
      })}}));

    ctx.canvas.append('rect')
      .attr('x', 0).attr('y', ymax)
      .attr('width', settings.width).attr('height', ymin-ymax)
      .style('fill', colour(0))
      .style('opacity', .2);

    var language = ctx.canvas.selectAll('.language')
        .data(layout)
      .enter().append('g')
        .attr('class', 'language');

    language.append('path')
      .attr('class', 'area')
      .attr('d', d => area(d.values))
      .style('fill', d => colour(d.name))
      .style('opacity', 0.7);

    language.append('text')
      .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
      .translate(d => [x(d.value.date), y(d.value.y0 + d.value.y / 2)])
      .attr('x', '2px')
      .attr('dy', '.35em')
      .text(function(d) { return d.name.replace(/^[\d+|∞] - /, ''); });

    drawYaxis(ctx, y, 'Lines per language');

  }

  //==========================================================================


  const buildGfxContext = (settings) => {
    const canvas = d3.select('#canvas')
      .append('g')
      .attr('width', settings.width)
      .attr('height', settings.height)
      .translate([settings.margin.left, settings.margin.top]);

    const message = d3.select('#canvas')
      .append('text')
      .attr('x', settings.margin.left).attr('y', settings.margin.top/2);

    const cursor = canvas.append('line.cursor').attr('y2', settings.height + 200);

    const eventZone = null;

    const colours = d3.scale.category10();

    return { canvas: canvas, message: message, cursor: cursor, eventZone: eventZone, colours: colours };
  }

  //==========================================================================

  const main = () => {
    const settings = {
      margin: {top: 80, right: 40, bottom: 40, left:70},
      width: 800,
      height: 400,
      numberOfBins: 60
    }

    const ctx = buildGfxContext(settings);

    d3.csv('repo/lines.csv', (error, data) => {
      if (error) throw error;
      data = data.map(d => { d.date = timeParse(d.date); return d; });
      data.sort((a,b) => a.date.getTime() - b.date.getTime());

      const startTime = data[0].date;
      const endTime = data[data.length-1].date;
      const x = timeScale(startTime, endTime, settings.width);
      const xi = x.invert;

      drawBarChart(data, ctx, x, settings, 0, 100);
      drawPath(data, ctx, 'Number of files', 0, 250, 150, x, settings, dispatch);
      drawPath(data, ctx, 'Number of lines', 1, 400, 300, x, settings, dispatch);
      drawStack(data, ctx, 3, 550, 450, x, settings, dispatch);

      // must be done at the end to be the first object to receive DOM events
      ctx.eventZone = ctx.canvas.append('rect')
        .attr('width', settings.width)
        .attr('height', settings.height)
        .attr('opacity', 0);
      ctx.eventZone
        .on('mousemove', mouseMove(data, xi, ctx, dispatch))
        .on('mouseover', mouseOver(ctx, dispatch))
        .on('mouseout', mouseOut(ctx, dispatch));
    });
  }


  main();

}());
