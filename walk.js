'use strict';

const exec = require('child_process').execFileSync;
var path = process.argv[2];

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

console.warn('Resetting repository');
run('git', ['reset', '--hard', 'HEAD']);
run('git', ['pull']);

const commitHashes = run('git', ['log', '--format=%H', '.'])
  .split('\n')
  .filter(hash => /^[0-9a-f]{40}$/.test(hash));

const numPixels = 800;
const numCommits = commitHashes.length;
let step, smallStep, smallStepProbability;

console.warn(`This repo has ${numCommits} commits`);

if (numPixels < numCommits) {
  let commitSteps = numCommits / numPixels; // number of commits in 1 pixel
  smallStep = Math.floor(commitSteps);
  smallStepProbability = commitSteps - smallStep;

  console.warn(`We only want around ${numPixels} commits, so I will be stepping by ${smallStep} with ${smallStepProbability.toFixed(2)} probability.`);
} else {
  step = 1;
}

// retrieve the 5 latest most used languages
const firstCloc = JSON.parse(run('cloc', ['.', '--json']));
delete firstCloc['header'];
delete firstCloc['SUM'];
const fca = Object.keys(firstCloc).map(key => {
  var a = firstCloc[key];
  a.langName = key;
  return a;
});

fca.sort((a,b) => a.code < b.code);
fca.splice(5);


const fileTypes = fca.map(e => e.langName);

console.log(csvLine(['date', 'message', 'Number of files','Number of lines'].concat(fileTypes.map((e,i) => i+' - '+e))));

for (let commitCount=0;
     commitCount < numCommits;
     commitCount += step || (Math.random() < smallStepProbability ? smallStep : smallStep+1)) {
  const message = run('git', ['log', '--format=%B', '-n', '1', 'HEAD']).replace(/\n/g,' ');
  const date = run('git', ['show', '-s', '--format=%ad', '--date=iso8601']);
  const cloc = JSON.parse(run('cloc', ['.', '--json']));
  const numFiles = cloc.SUM.nFiles;
  const numLines = cloc.SUM.code;
  const lineCounts = fileTypes.map(type => cloc[type] ? cloc[type].code : 0);

  console.log(csvLine([date, message, numFiles, numLines].concat(lineCounts)));

  console.warn(`Commit: ${commitCount} / ${numCommits} (${(100*commitCount/numCommits).toFixed(2)}%)`);
  run('git', ['reset', '--hard', commitHashes[commitCount]]);
}

run('git', ['reset', '--hard', 'HEAD']);
