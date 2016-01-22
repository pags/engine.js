function CommentExample(el, options) {
    curvilinear.Controller.apply(this, arguments);
    this.url = options.url;
}

CommentExample.prototype = Object.create(curvilinear.Controller.prototype);

CommentExample.prototype.datasources = {
    comments: function() {
        var self = this;
        return $.ajax({
            url: this.url,
            dataType: 'json',
            cache: false
        }).then(function(comments) {
            comments.forEach(function(comment) {
                comment.text = marked(comment.text, {
                    sanitize: true
                });
            });
            return comments;
        }, function(xhr, status, err) {
            console.error(self.url, status, err.toString());
        });
    }
};

CommentExample.prototype.events = {
    'submit form': function(e) {
        var self = this;
        e.preventDefault();
        var author = $('input[name="author"]').val();
        var text = $('input[name="text"]').val();
        if (!text || !author) {
            return;
        }
        $.ajax({
            url: this.url,
            dataType: 'json',
            type: 'POST',
            data: {
                author: author,
                text: text
            }
        }).then(function() {
            $('input[name="author"]').val('');
            $('input[name="text"]').val('');
            self.render();
        }, function(xhr, status, err) {
            console.error(self.url, status, err.toString());
        });
    }
};

CommentExample.prototype.generateHTML = function(data) {
    return nunjucks.renderString('<div class="commentBox"> \
        <h1>Comments</h1> \
        <div class="commentList"> \
            {% for comment in comments %} \
            <div class="comment"><h2 class="commentAuthor">{{comment.author}}</h2><span><p>{{comment.text|safe}}</p></span></div> \
            {% endfor %} \
        </div> \
        <form class="commentForm"> \
            <input type="text" name="author" placeholder="Your name" value=""> \
            <input type="text" name="text" placeholder="Say something..." value=""> \
            <input type="submit" value="Post"> \
        </form> \
    </div>', data);
};

var example = new CommentExample('#content', {
    url: '/api/comments'
});

example.render();

setInterval(example.render.bind(example), 2000);
