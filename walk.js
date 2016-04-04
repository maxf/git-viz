const exec = require('child_process').execFileSync;
var path = process.argv[2];
var finished=0;
var message, date;

function run(command, args, stdio) {
  return exec(command, args, {
    cwd: path,
    stdio: 'pipe'
  }).toString();
}

function csvEscape(value) {
  return `"${value.toString().replace(/\n+/g, ' ').trim().replace(/"/g,'""')}"`;
}

function csvLine(arr) {
  return arr.map(str => csvEscape(str)).join(',');
}

run('git', ['reset', '--hard', 'HEAD']);
run('git', ['pull']);

const numLines = +run('git', ['rev-list', 'HEAD', '--count']);
const commitStep = 1 + Math.min(1, Math.floor(numLines/800));

// retrieve the 5 latest most used languages
firstCloc = JSON.parse(run('cloc', ['.', '--json']));
delete firstCloc['header'];
delete firstCloc['SUM'];
fca = Object.keys(firstCloc).map(key => {
  var a = firstCloc[key];
  a.langName = key;
  return a;
});

fca.sort((a,b) => a.code < b.code);
fca.splice(5);


fileTypes = fca.map(e => e.langName);

console.log(csvLine(['date', 'message', 'Number of files','Number of lines'].concat(fileTypes.map((e,i) => i+' - '+e))));

do {
  message = run('git', ['log', '--format=%B', '-n', '1', 'HEAD']).replace(/\n/g,' ');
  date = run('git', ['show', '-s', '--format=%ad', '--date=iso8601']);
  cloc = JSON.parse(run('cloc', ['.', '--json']));
  numFiles = cloc.SUM.nFiles;
  numLines = cloc.SUM.code;
  lineCounts = fileTypes.map(type => cloc[type] ? cloc[type].code : 0);

  console.log(csvLine([date, message, numFiles, numLines].concat(lineCounts)));

  // TODO: count the number of commits to skip so that we don't have too many lines in the CSV
  try {
    run('git', ['reset', '--hard', 'HEAD~'+commitStep], 'ignore');
  } catch (e) {
    // console.log("EXCEPT");
    finished = e;
  }
} while (!finished);

run('git', ['reset', '--hard', 'HEAD']);