import { AppComponent } from './app';

describe('App component', () => {
    var appComp = new AppComponent(); 

    it('should greet', () => {
        expect(appComp.testFunction()).toBe(2);
    })
})
