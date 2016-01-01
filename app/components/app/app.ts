import 'bootstrap';
import 'bootstrap/css/bootstrap.min.css!css';

import {Component} from 'angular2/core';
import {Typeahead} from './Typeahead';
import template from './app.html!text';

@Component({
    directives: [Typeahead],
    selector: 'my-app',
    template: template
})
export class AppComponent {
    public plop(s:string) {
        console.log(s)
    }
    
    testFunction(){
        return 2;
    }
}