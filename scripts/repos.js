'use strict';

const Repos = {

  // returns the list of repo CSV files
  // required an index.txt file
  getIndex: (callback) => {
    return d3.text('git-data/index.txt', (error, text) => {
      if (error) throw error;
      callback(text.split('\n').filter(fileName => /\.csv$/.test(fileName)));
    });
  },

  makeSelector: (list) => {
    let html = ['<select>'];
    html = html.concat(list.map(fileName => `<option value="${fileName}">${fileName}</option>`));
    html.push('</select>');
    return html.join('');
  }


}