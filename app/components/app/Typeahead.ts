import {Component, Input, Output} from 'angular2/core';
import {CORE_DIRECTIVES, FORM_DIRECTIVES, Control} from 'angular2/common';

import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';

@Component({
    directives: [CORE_DIRECTIVES, FORM_DIRECTIVES],
    selector: 'typeahead',
    template: `
        <input #auto type="text" [ngFormControl]="searchText" placeholder="Type to autocomplete" />
    `
})
export class Typeahead {
    public searchText:Control = new Control();

    @Input() from;

    @Output() out = this.searchText.valueChanges
        .filter(x => x.length > 2)
        .distinctUntilChanged()
        .debounceTime(300)
    ;
}
