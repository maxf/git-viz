
var exec = require('child_process').exec;
var path = process.argv[2];
var err = process.stderr;
var out = process.stdout;

var cb  = (error, stdout, stderr) => {
  if (error) {
    err.write(error.message);
  } else {
    out.write(stdout);
  }
}


var ret = exec("ls", {cwd: path}, cb);
