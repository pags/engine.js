describe('DOMTransform', function() {
    var expect = window.chai.expect,
        sandbox = document.getElementById('sandbox'),
        transform = function(el, html) {
            var newEl = document.createElement('body');

            newEl.innerHTML = '<div id="sandbox" style="display:none">' + html + '</div>';

            window.curvilinear.DOMTransform(newEl.childNodes[0], el);
        },
        assertTransform = function(oldHTML, newHTML, done) {
            sandbox.innerHTML = oldHTML;

            transform(sandbox, newHTML);

            var sandboxCopy = sandbox.cloneNode(true);

            sandboxCopy.innerHTML = newHTML;

            expect(sandbox.outerHTML).to.equal(sandboxCopy.outerHTML);

            if (done) {
                done();
            }
        };

    it('appends new text nodes in the middle of other elements', function(done) {
        assertTransform('<div></div><div></div>', '<div>hello world</div><div></div>', done);
    });

    it('appends new elements and text nodes from blank slate', function(done) {
        assertTransform('', '<div>foo</div>', done);
    });

    it('replaces text nodes with elements', function(done) {
        assertTransform('foo', '<div>bar</div>', done);
    });

    it('replaces text nodes', function(done) {
        assertTransform('foo', 'bar', done);
    });

    it('replaces elements with text nodes and elements', function(done) {
        assertTransform('<div><p></p></div>', '<div>one<input type="text" value="hello there"></div>', done);
    });

    it('appends multiple elements', function(done) {
        assertTransform('<div></div>', '<div><div>hi</div><div>there</div></div>', done);
    });

    it('appends new elements', function(done) {
        assertTransform('<div>one</div>', '<div>one</div><div>two</div>', done);
    });

    it('appends sets of new elements', function(done) {
        assertTransform('<div>one</div>', '<div>one</div><div>two</div><div>three</div>', done);
    });

    it('appends new inner text nodes', function(done) {
        assertTransform('<div></div>', '<div>foo</div>', done);
    });

    it('appends new outer text nodes to elements with children', function(done) {
        assertTransform('<div>one</div>', '<div>one</div>hello', done);
    });

    it('appends new outer text nodes and adds children to elements without children', function(done) {
        assertTransform('<div></div>', '<div>one</div>hello', done);
    });

    it('appends new outer text nodes to elements without children', function(done) {
        assertTransform('<div></div>', '<div></div>hello', done);
    });

    it('removes old child elements', function(done) {
        assertTransform('<div>one<div>two</div></div>', '<div>one</div>', done);
    });

    it('removes multiple old child elements, while keeping existing', function(done) {
        assertTransform('<div> <div>one</div><div>two</div></div>', '<div> </div>', done);
    });

    it('removes multiple old child elements', function(done) {
        assertTransform('<div><div>one</div><div>two</div></div>', '<div></div>', done);
    });

    it('removes old sibling elements', function(done) {
        assertTransform('<div>one</div><div>two</div>', '<div>one</div>', done);
    });

    it('removes old sibling text nodes', function(done) {
        assertTransform('<div>one</div>hello', '<div>one</div>', done);
    });

    it('mutates element attributes', function(done) {
        assertTransform('<div class="foo" style="color:blue"></div>', '<div class="bar"></div>', done);
    });

    it('mutates a text input value', function(done) {
        assertTransform('<input type="text" value="foo">', '<input type="text" value="bar">');

        expect(document.querySelector('input').value).to.equal('bar');

        done();
    });

    it('mutates a checkbox selection', function(done) {
        assertTransform('<input type="checkbox">', '<input type="checkbox" checked="">');

        expect(document.querySelector('input').checked).to.equal(true);

        done();
    });

    it('mutates a textarea selection', function(done) {
        assertTransform('<textarea>foo</textarea>', '<textarea>bar</textarea>');

        expect(document.querySelector('textarea').value).to.equal('bar');

        done();
    });

    it('replaces mismatched element types', function(done) {
        assertTransform('<input type="text" value="foo">', '<p>bar</p>', done);
    });
});
