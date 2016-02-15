/* global d3 */
(function() {

var margin = {top: 40, right: 40, bottom: 40, left:40},
    width = 800, height = 400;

function setUpTimeScaleAndAxis(minDate, maxDate, margin) {
  var time = d3.time.scale()
    .domain([minDate, d3.time.day.offset(maxDate, 1)])
    .rangeRound([0, width - margin.left - margin.right]);

  var timeAxis = d3.svg.axis()
    .scale(time)
    .orient('bottom')
    .ticks(d3.time.months, 3)
    .tickFormat(d3.time.format('%m/%y'))
    .tickSize(10, 0)
    .tickPadding(8);
    
  return {time: time, timeAxis: timeAxis};
}

d3.text('repo/log.txt', function(error, text) {
  var commits = text.split('\n').map(function(commit) {
    return {
      hash: commit.substring(0,7),
      date: new Date(commit.substring(8,37)),
      comment: commit.substring(38)
    };
  });

  var minDate = commits[commits.length-1].date;
  var maxDate = commits[0].date;  
  var timeStuff = setUpTimeScaleAndAxis(minDate, maxDate, margin);
  var time = timeStuff.time, timeAxis = timeStuff.timeAxis;
  var svg = d3.select('#canvas')
    .append('g')
    .attr('width', width)
    .attr('height', height)
    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
  ;

  svg
    .selectAll('circle')
    .data(commits)
    .enter()
    .append('circle')
      .attr('cx', function(commit) { return time(commit.date) })
      .attr('cy', 100)
      .attr('r', 2)
      .attr('fill', 'red')
  ;
  
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
    .call(timeAxis)
  ;

});


}());