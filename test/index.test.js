// Polyfill for "tsyringe" dependency injection
import 'core-js/es7/reflect';
import {configure} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({adapter: new Adapter()});

const contextReact = require.context('../src/script', true, /.test\.[tj]sx?$/);
const contextKnockout = require.context('../test', true, /.Spec.js$/);

contextReact.keys().forEach(contextReact);
contextKnockout.keys().forEach(contextKnockout);
