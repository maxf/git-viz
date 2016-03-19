const exec = require('child_process').execFileSync;
var path = process.argv[2];

console.log(exec('ls', {cwd: path}).toString());
