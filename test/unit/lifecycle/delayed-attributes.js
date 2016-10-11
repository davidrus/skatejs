import { define, prop, props, vdom } from '../../../src/index';
import afterMutations from '../../lib/after-mutations';
import element from '../../lib/element';
import fixture from '../../lib/fixture';

describe('lifecycle/attributes', () => {
  function create(definition = {}, name = 'testName', value) {
    const elem = new (element().skate({
      props: {
        [name]: definition,
      },
    }))();
    if (arguments.length === 3) { // eslint-disable-line prefer-rest-params
      elem[name] = value;
    }
    return elem;
  }

  describe('attribute set after attach', () => {
    it('with prop already set', (done) => {
      const elem = create({ attribute: true }, 'testName', 'something');
      expect(elem.getAttribute('test-name')).to.equal(null);
      fixture(elem);
      afterMutations(() => {
        expect(elem.getAttribute('test-name')).to.equal('something');
        done();
      });
    });

    it('with prop set via default', (done) => {
      const elem = create({ attribute: true, default: 'something' }, 'testName');
      expect(elem.getAttribute('test-name')).to.equal(null);
      fixture(elem);
      afterMutations(() => {
        expect(elem.getAttribute('test-name')).to.equal('something');
        done();
      });
    });

    it('with prop set via initial', (done) => {
      const elem = create({ attribute: true, initial: 'something' }, 'testName');
      expect(elem.getAttribute('test-name')).to.equal(null);
      fixture(elem);
      afterMutations(() => {
        expect(elem.getAttribute('test-name')).to.equal('something');
        done();
      });
    });
  });

  describe('attribute set before attach', () => {
    it('should retain pre-attach attribute value when attached even if prop set', (done) => {
      const elem = create({ attribute: true }, 'testName', 'prop-value');
      expect(elem.testName).to.equal('prop-value', 'prop before attr');
      elem.setAttribute('test-name', 'attr-value');
      afterMutations(() => {
        expect(elem.testName).to.equal('attr-value', 'prop after attr');
        expect(elem.getAttribute('test-name')).to.equal('attr-value');
        fixture(elem);
        afterMutations(() => {
          expect(elem.getAttribute('test-name')).to.equal('attr-value');
          done();
        });
      });
    });
  });

  describe('property set by attribute provided in markup', () => {
    function createElemMaybeWithLinkedAttrs(isLinked) {
      const propObj = isLinked ? { attribute: true } : {};
      const newElem = element();
      const tagName = newElem.safe;

      define(tagName, {
        props: {
          label: prop.string(propObj),
          done: prop.boolean(propObj),
        },
      });

      return tagName;
    }

    const testSets = [
      {
        summary: 'should not reflect attr to props if not linked',
        outer: {
          isLinked: false,
          expectedDone: false,
          expectedLabel: '',
        },
        inner: {
          isLinked: false,
          expectedDone: false,
          expectedLabel: '',
        },
      },
      {
        summary: 'should reflect attr to props if linked',
        outer: {
          isLinked: true,
          expectedDone: true,
          expectedLabel: 'world',
        },
        inner: {
          isLinked: false,
          expectedDone: false,
          expectedLabel: '',
        },
      },
    ];

    testSets.forEach((testSet) => {
      it(testSet.summary, (done) => {
        const outerTag = createElemMaybeWithLinkedAttrs(testSet.outer.isLinked);
        const innerTag = createElemMaybeWithLinkedAttrs(testSet.inner.isLinked);

        fixture(`
          <${outerTag} label="world" done>
            <${innerTag} label="world" done></${innerTag}>
          </${outerTag}>
        `);
        afterMutations(() => {
          const outerElem = document.querySelector(outerTag);
          expect(outerElem.done).to.equal(testSet.outer.expectedDone);
          expect(outerElem.label).to.equal(testSet.outer.expectedLabel);

          const innerElem = outerElem.querySelector(innerTag);
          expect(innerElem.done).to.equal(testSet.inner.expectedDone);
          expect(innerElem.label).to.equal(testSet.inner.expectedLabel);
          done();
        });
      });
    });

    it.only('should not reflect change to generated child without linked attribute', (done) => {
      // inner component *wthout* linked attrs/props
      const inner = element();
      const innerTagName = inner.safe;
      inner.skate({
        props: {
          label: prop.string(),
          done: prop.boolean(),
        },
      });

      // outer component which renders the inner component
      const outer = element();
      const outerTagName = outer.safe;
      outer.skate({
        render() {
          vdom.element(innerTagName, { label: 'world', done: '' });
        },
      });

      fixture(`
        <${outerTagName}></${outerTagName}>
      `);

      afterMutations(() => {
        const innerElem = document.querySelector(outerTagName).shadowRoot.querySelector(innerTagName);
        expect(innerElem.getAttribute('label')).to.equal('world', 'attr');
        expect(innerElem.getAttribute('done')).to.equal('', 'attr');
        expect(innerElem.label).to.equal(null, 'prop');
        expect(innerElem.done).to.equal(null, 'prop');
        done();
      }, 1);
    });
  });
});
