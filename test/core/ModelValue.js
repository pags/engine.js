describe('ModelValue', function() {
    var expect = window.chai.expect;

    it('takes key and value', function(done) {
        var modelValue = new window.engine.ModelValue('foo', 'bar');

        expect(modelValue.key).to.equal('foo');
        expect(modelValue.value).to.equal('bar');

        done();
    });
});