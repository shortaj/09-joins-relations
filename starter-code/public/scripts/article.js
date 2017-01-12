'use strict';

function Article (opts) {
  Object.keys(opts).forEach(function(e) {
    this[e] = opts[e]
  }, this);
}

Article.all = [];

Article.prototype.toHtml = function() {
  var template = Handlebars.compile($('#article-template').text());

  this.daysAgo = parseInt((new Date() - new Date(this.publishedOn))/60/60/24/1000);
  this.publishStatus = this.publishedOn ? `published ${this.daysAgo} days ago` : '(draft)';
  this.body = marked(this.body);

  return template(this);
};

Article.loadAll = function(rows) {
  rows.sort(function(a,b) {
    return (new Date(b.publishedOn)) - (new Date(a.publishedOn));
  });

  Article.all = rows.map(function(ele) {
    return new Article(ele);
  });
};

Article.fetchAll = function(callback) {
  $.get('/articles/all')
  .then(
    function(results) {
      if (results.rows.length) {
        Article.loadAll(results.rows);
        callback();
      } else {
        $.getJSON('./data/hackerIpsum.json')
        .then(function(rawData) {
          rawData.forEach(function(item) {
            let article = new Article(item);
            article.insertRecord();
          })
        })
        .then(function() {
          Article.fetchAll(callback);
        })
        .catch(function(err) {
          console.error(err);
        });
      }
    }
  )
};

Article.truncateTable = function(callback) {
  $.ajax({
    url: '/articles/truncate',
    method: 'DELETE',
  })
  .then(function(data) {
    console.log(data);
    if (callback) callback();
  });
};

Article.prototype.insertRecord = function(callback) {
  $.post('/articles/insert', {author: this.author, authorUrl: this.authorUrl, body: this.body, category: this.category, publishedOn: this.publishedOn, title: this.title})
  .then(function(data) {
    console.log(data);
    if (callback) callback();
  })
};

Article.prototype.deleteRecord = function(callback) {
  $.ajax({
    url: '/articles/delete',
    method: 'DELETE',
    data: {id: this.article_id}
  })
  .then(function(data) {
    console.log(data);
    if (callback) callback();
  });
};

Article.prototype.updateRecord = function(callback) {
  $.ajax({
    url: '/articles/update',
    method: 'PUT',
    data: {
      author: this.author,
      authorUrl: this.authorUrl,
      body: this.body,
      category: this.category,
      publishedOn: this.publishedOn,
      title: this.title,
      id: this.article_id
    }
  })
  .then(function(data) {
    console.log(data);
    if (callback) callback();
  });
};
