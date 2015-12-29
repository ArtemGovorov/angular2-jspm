/* */ 
"format cjs";
import { IS_DART, isBlank } from 'angular2/src/facade/lang';
import { codify, combineGeneratedStrings, rawString } from './codegen_facade';
import { RecordType } from './proto_record';
import { ChangeDetectionStrategy } from './constants';
import { BaseException } from 'angular2/src/facade/exceptions';
/**
 * Class responsible for providing change detection logic for change detector classes.
 */
export class CodegenLogicUtil {
    constructor(_names, _utilName, _changeDetectorStateName, _changeDetection) {
        this._names = _names;
        this._utilName = _utilName;
        this._changeDetectorStateName = _changeDetectorStateName;
        this._changeDetection = _changeDetection;
    }
    /**
     * Generates a statement which updates the local variable representing `protoRec` with the current
     * value of the record. Used by property bindings.
     */
    genPropertyBindingEvalValue(protoRec) {
        return this._genEvalValue(protoRec, idx => this._names.getLocalName(idx), this._names.getLocalsAccessorName());
    }
    /**
     * Generates a statement which updates the local variable representing `protoRec` with the current
     * value of the record. Used by event bindings.
     */
    genEventBindingEvalValue(eventRecord, protoRec) {
        return this._genEvalValue(protoRec, idx => this._names.getEventLocalName(eventRecord, idx), "locals");
    }
    _genEvalValue(protoRec, getLocalName, localsAccessor) {
        var context = (protoRec.contextIndex == -1) ?
            this._names.getDirectiveName(protoRec.directiveIndex) :
            getLocalName(protoRec.contextIndex);
        var argString = protoRec.args.map(arg => getLocalName(arg)).join(", ");
        var rhs;
        switch (protoRec.mode) {
            case RecordType.Self:
                rhs = context;
                break;
            case RecordType.Const:
                rhs = codify(protoRec.funcOrValue);
                break;
            case RecordType.PropertyRead:
                rhs = this._observe(`${context}.${protoRec.name}`, protoRec);
                break;
            case RecordType.SafeProperty:
                var read = this._observe(`${context}.${protoRec.name}`, protoRec);
                rhs =
                    `${this._utilName}.isValueBlank(${context}) ? null : ${this._observe(read, protoRec)}`;
                break;
            case RecordType.PropertyWrite:
                rhs = `${context}.${protoRec.name} = ${getLocalName(protoRec.args[0])}`;
                break;
            case RecordType.Local:
                rhs = this._observe(`${localsAccessor}.get(${rawString(protoRec.name)})`, protoRec);
                break;
            case RecordType.InvokeMethod:
                rhs = this._observe(`${context}.${protoRec.name}(${argString})`, protoRec);
                break;
            case RecordType.SafeMethodInvoke:
                var invoke = `${context}.${protoRec.name}(${argString})`;
                rhs =
                    `${this._utilName}.isValueBlank(${context}) ? null : ${this._observe(invoke, protoRec)}`;
                break;
            case RecordType.InvokeClosure:
                rhs = `${context}(${argString})`;
                break;
            case RecordType.PrimitiveOp:
                rhs = `${this._utilName}.${protoRec.name}(${argString})`;
                break;
            case RecordType.CollectionLiteral:
                rhs = `${this._utilName}.${protoRec.name}(${argString})`;
                break;
            case RecordType.Interpolate:
                rhs = this._genInterpolation(protoRec);
                break;
            case RecordType.KeyedRead:
                rhs = this._observe(`${context}[${getLocalName(protoRec.args[0])}]`, protoRec);
                break;
            case RecordType.KeyedWrite:
                rhs = `${context}[${getLocalName(protoRec.args[0])}] = ${getLocalName(protoRec.args[1])}`;
                break;
            case RecordType.Chain:
                rhs = 'null';
                break;
            default:
                throw new BaseException(`Unknown operation ${protoRec.mode}`);
        }
        return `${getLocalName(protoRec.selfIndex)} = ${rhs};`;
    }
    /** @internal */
    _observe(exp, rec) {
        // This is an experimental feature. Works only in Dart.
        if (this._changeDetection === ChangeDetectionStrategy.OnPushObserve) {
            return `this.observeValue(${exp}, ${rec.selfIndex})`;
        }
        else {
            return exp;
        }
    }
    genPropertyBindingTargets(propertyBindingTargets, genDebugInfo) {
        var bs = propertyBindingTargets.map(b => {
            if (isBlank(b))
                return "null";
            var debug = genDebugInfo ? codify(b.debug) : "null";
            return `${this._utilName}.bindingTarget(${codify(b.mode)}, ${b.elementIndex}, ${codify(b.name)}, ${codify(b.unit)}, ${debug})`;
        });
        return `[${bs.join(", ")}]`;
    }
    genDirectiveIndices(directiveRecords) {
        var bs = directiveRecords.map(b => `${this._utilName}.directiveIndex(${b.directiveIndex.elementIndex}, ${b.directiveIndex.directiveIndex})`);
        return `[${bs.join(", ")}]`;
    }
    /** @internal */
    _genInterpolation(protoRec) {
        var iVals = [];
        for (var i = 0; i < protoRec.args.length; ++i) {
            iVals.push(codify(protoRec.fixedArgs[i]));
            iVals.push(`${this._utilName}.s(${this._names.getLocalName(protoRec.args[i])})`);
        }
        iVals.push(codify(protoRec.fixedArgs[protoRec.args.length]));
        return combineGeneratedStrings(iVals);
    }
    genHydrateDirectives(directiveRecords) {
        var res = [];
        for (var i = 0; i < directiveRecords.length; ++i) {
            var r = directiveRecords[i];
            res.push(`${this._names.getDirectiveName(r.directiveIndex)} = ${this._genReadDirective(i)};`);
        }
        return res.join("\n");
    }
    _genReadDirective(index) {
        // This is an experimental feature. Works only in Dart.
        if (this._changeDetection === ChangeDetectionStrategy.OnPushObserve) {
            return `this.observeDirective(this.getDirectiveFor(directives, ${index}), ${index})`;
        }
        else {
            return `this.getDirectiveFor(directives, ${index})`;
        }
    }
    genHydrateDetectors(directiveRecords) {
        var res = [];
        for (var i = 0; i < directiveRecords.length; ++i) {
            var r = directiveRecords[i];
            if (!r.isDefaultChangeDetection()) {
                res.push(`${this._names.getDetectorName(r.directiveIndex)} = this.getDetectorFor(directives, ${i});`);
            }
        }
        return res.join("\n");
    }
    genContentLifecycleCallbacks(directiveRecords) {
        var res = [];
        var eq = IS_DART ? '==' : '===';
        // NOTE(kegluneq): Order is important!
        for (var i = directiveRecords.length - 1; i >= 0; --i) {
            var dir = directiveRecords[i];
            if (dir.callAfterContentInit) {
                res.push(`if(${this._names.getStateName()} ${eq} ${this._changeDetectorStateName}.NeverChecked) ${this._names.getDirectiveName(dir.directiveIndex)}.ngAfterContentInit();`);
            }
            if (dir.callAfterContentChecked) {
                res.push(`${this._names.getDirectiveName(dir.directiveIndex)}.ngAfterContentChecked();`);
            }
        }
        return res;
    }
    genViewLifecycleCallbacks(directiveRecords) {
        var res = [];
        var eq = IS_DART ? '==' : '===';
        // NOTE(kegluneq): Order is important!
        for (var i = directiveRecords.length - 1; i >= 0; --i) {
            var dir = directiveRecords[i];
            if (dir.callAfterViewInit) {
                res.push(`if(${this._names.getStateName()} ${eq} ${this._changeDetectorStateName}.NeverChecked) ${this._names.getDirectiveName(dir.directiveIndex)}.ngAfterViewInit();`);
            }
            if (dir.callAfterViewChecked) {
                res.push(`${this._names.getDirectiveName(dir.directiveIndex)}.ngAfterViewChecked();`);
            }
        }
        return res;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWdlbl9sb2dpY191dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5ndWxhcjIvc3JjL2NvcmUvY2hhbmdlX2RldGVjdGlvbi9jb2RlZ2VuX2xvZ2ljX3V0aWwudHMiXSwibmFtZXMiOlsiQ29kZWdlbkxvZ2ljVXRpbCIsIkNvZGVnZW5Mb2dpY1V0aWwuY29uc3RydWN0b3IiLCJDb2RlZ2VuTG9naWNVdGlsLmdlblByb3BlcnR5QmluZGluZ0V2YWxWYWx1ZSIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuRXZlbnRCaW5kaW5nRXZhbFZhbHVlIiwiQ29kZWdlbkxvZ2ljVXRpbC5fZ2VuRXZhbFZhbHVlIiwiQ29kZWdlbkxvZ2ljVXRpbC5fb2JzZXJ2ZSIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuUHJvcGVydHlCaW5kaW5nVGFyZ2V0cyIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuRGlyZWN0aXZlSW5kaWNlcyIsIkNvZGVnZW5Mb2dpY1V0aWwuX2dlbkludGVycG9sYXRpb24iLCJDb2RlZ2VuTG9naWNVdGlsLmdlbkh5ZHJhdGVEaXJlY3RpdmVzIiwiQ29kZWdlbkxvZ2ljVXRpbC5fZ2VuUmVhZERpcmVjdGl2ZSIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuSHlkcmF0ZURldGVjdG9ycyIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuQ29udGVudExpZmVjeWNsZUNhbGxiYWNrcyIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuVmlld0xpZmVjeWNsZUNhbGxiYWNrcyJdLCJtYXBwaW5ncyI6Ik9BQU8sRUFBQyxPQUFPLEVBQWtDLE9BQU8sRUFBQyxNQUFNLDBCQUEwQjtPQUVsRixFQUFDLE1BQU0sRUFBRSx1QkFBdUIsRUFBRSxTQUFTLEVBQUMsTUFBTSxrQkFBa0I7T0FDcEUsRUFBYyxVQUFVLEVBQUMsTUFBTSxnQkFBZ0I7T0FHL0MsRUFBQyx1QkFBdUIsRUFBQyxNQUFNLGFBQWE7T0FDNUMsRUFBQyxhQUFhLEVBQUMsTUFBTSxnQ0FBZ0M7QUFFNUQ7O0dBRUc7QUFDSDtJ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QUlBLEdBQUdBLEdBQUdBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDOUJBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzFCQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUNKQSxNQUFNQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxJQUFJQSxDQUFDQSx3QkFBd0JBLGtCQUFrQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxHQUFHQSxDQUFDQSxjQUFjQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUNBO1lBQ3RLQSxDQUFDQTtZQUVEQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxvQkFBb0JBLENBQUNBLENBQUNBLENBQUNBO2dCQUM3QkEsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxHQUFHQSxDQUFDQSxjQUFjQSxDQUFDQSx3QkFBd0JBLENBQUNBLENBQUNBO1lBQ3hGQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUNEQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQTtJQUNiQSxDQUFDQTtBQUNIYixDQUFDQTtBQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJU19EQVJULCBKc29uLCBTdHJpbmdXcmFwcGVyLCBpc1ByZXNlbnQsIGlzQmxhbmt9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge0NvZGVnZW5OYW1lVXRpbH0gZnJvbSAnLi9jb2RlZ2VuX25hbWVfdXRpbCc7XG5pbXBvcnQge2NvZGlmeSwgY29tYmluZUdlbmVyYXRlZFN0cmluZ3MsIHJhd1N0cmluZ30gZnJvbSAnLi9jb2RlZ2VuX2ZhY2FkZSc7XG5pbXBvcnQge1Byb3RvUmVjb3JkLCBSZWNvcmRUeXBlfSBmcm9tICcuL3Byb3RvX3JlY29yZCc7XG5pbXBvcnQge0JpbmRpbmdUYXJnZXR9IGZyb20gJy4vYmluZGluZ19yZWNvcmQnO1xuaW1wb3J0IHtEaXJlY3RpdmVSZWNvcmR9IGZyb20gJy4vZGlyZWN0aXZlX3JlY29yZCc7XG5pbXBvcnQge0NoYW5nZURldGVjdGlvblN0cmF0ZWd5fSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQge0Jhc2VFeGNlcHRpb259IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvZXhjZXB0aW9ucyc7XG5cbi8qKlxuICogQ2xhc3MgcmVzcG9uc2libGUgZm9yIHByb3ZpZGluZyBjaGFuZ2UgZGV0ZWN0aW9uIGxvZ2ljIGZvciBjaGFuZ2UgZGV0ZWN0b3IgY2xhc3Nlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvZGVnZW5Mb2dpY1V0aWwge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9uYW1lczogQ29kZWdlbk5hbWVVdGlsLCBwcml2YXRlIF91dGlsTmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICBwcml2YXRlIF9jaGFuZ2VEZXRlY3RvclN0YXRlTmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICBwcml2YXRlIF9jaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5KSB7fVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYSBzdGF0ZW1lbnQgd2hpY2ggdXBkYXRlcyB0aGUgbG9jYWwgdmFyaWFibGUgcmVwcmVzZW50aW5nIGBwcm90b1JlY2Agd2l0aCB0aGUgY3VycmVudFxuICAgKiB2YWx1ZSBvZiB0aGUgcmVjb3JkLiBVc2VkIGJ5IHByb3BlcnR5IGJpbmRpbmdzLlxuICAgKi9cbiAgZ2VuUHJvcGVydHlCaW5kaW5nRXZhbFZhbHVlKHByb3RvUmVjOiBQcm90b1JlY29yZCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2dlbkV2YWxWYWx1ZShwcm90b1JlYywgaWR4ID0+IHRoaXMuX25hbWVzLmdldExvY2FsTmFtZShpZHgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbmFtZXMuZ2V0TG9jYWxzQWNjZXNzb3JOYW1lKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhIHN0YXRlbWVudCB3aGljaCB1cGRhdGVzIHRoZSBsb2NhbCB2YXJpYWJsZSByZXByZXNlbnRpbmcgYHByb3RvUmVjYCB3aXRoIHRoZSBjdXJyZW50XG4gICAqIHZhbHVlIG9mIHRoZSByZWNvcmQuIFVzZWQgYnkgZXZlbnQgYmluZGluZ3MuXG4gICAqL1xuICBnZW5FdmVudEJpbmRpbmdFdmFsVmFsdWUoZXZlbnRSZWNvcmQ6IGFueSwgcHJvdG9SZWM6IFByb3RvUmVjb3JkKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZ2VuRXZhbFZhbHVlKHByb3RvUmVjLCBpZHggPT4gdGhpcy5fbmFtZXMuZ2V0RXZlbnRMb2NhbE5hbWUoZXZlbnRSZWNvcmQsIGlkeCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImxvY2Fsc1wiKTtcbiAgfVxuXG4gIHByaXZhdGUgX2dlbkV2YWxWYWx1ZShwcm90b1JlYzogUHJvdG9SZWNvcmQsIGdldExvY2FsTmFtZTogRnVuY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbHNBY2Nlc3Nvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICB2YXIgY29udGV4dCA9IChwcm90b1JlYy5jb250ZXh0SW5kZXggPT0gLTEpID9cbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9uYW1lcy5nZXREaXJlY3RpdmVOYW1lKHByb3RvUmVjLmRpcmVjdGl2ZUluZGV4KSA6XG4gICAgICAgICAgICAgICAgICAgICAgZ2V0TG9jYWxOYW1lKHByb3RvUmVjLmNvbnRleHRJbmRleCk7XG4gICAgdmFyIGFyZ1N0cmluZyA9IHByb3RvUmVjLmFyZ3MubWFwKGFyZyA9PiBnZXRMb2NhbE5hbWUoYXJnKSkuam9pbihcIiwgXCIpO1xuXG4gICAgdmFyIHJoczogc3RyaW5nO1xuICAgIHN3aXRjaCAocHJvdG9SZWMubW9kZSkge1xuICAgICAgY2FzZSBSZWNvcmRUeXBlLlNlbGY6XG4gICAgICAgIHJocyA9IGNvbnRleHQ7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFJlY29yZFR5cGUuQ29uc3Q6XG4gICAgICAgIHJocyA9IGNvZGlmeShwcm90b1JlYy5mdW5jT3JWYWx1ZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFJlY29yZFR5cGUuUHJvcGVydHlSZWFkOlxuICAgICAgICByaHMgPSB0aGlzLl9vYnNlcnZlKGAke2NvbnRleHR9LiR7cHJvdG9SZWMubmFtZX1gLCBwcm90b1JlYyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFJlY29yZFR5cGUuU2FmZVByb3BlcnR5OlxuICAgICAgICB2YXIgcmVhZCA9IHRoaXMuX29ic2VydmUoYCR7Y29udGV4dH0uJHtwcm90b1JlYy5uYW1lfWAsIHByb3RvUmVjKTtcbiAgICAgICAgcmhzID1cbiAgICAgICAgICAgIGAke3RoaXMuX3V0aWxOYW1lfS5pc1ZhbHVlQmxhbmsoJHtjb250ZXh0fSkgPyBudWxsIDogJHt0aGlzLl9vYnNlcnZlKHJlYWQsIHByb3RvUmVjKX1gO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBSZWNvcmRUeXBlLlByb3BlcnR5V3JpdGU6XG4gICAgICAgIHJocyA9IGAke2NvbnRleHR9LiR7cHJvdG9SZWMubmFtZX0gPSAke2dldExvY2FsTmFtZShwcm90b1JlYy5hcmdzWzBdKX1gO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBSZWNvcmRUeXBlLkxvY2FsOlxuICAgICAgICByaHMgPSB0aGlzLl9vYnNlcnZlKGAke2xvY2Fsc0FjY2Vzc29yfS5nZXQoJHtyYXdTdHJpbmcocHJvdG9SZWMubmFtZSl9KWAsIHByb3RvUmVjKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5JbnZva2VNZXRob2Q6XG4gICAgICAgIHJocyA9IHRoaXMuX29ic2VydmUoYCR7Y29udGV4dH0uJHtwcm90b1JlYy5uYW1lfSgke2FyZ1N0cmluZ30pYCwgcHJvdG9SZWMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBSZWNvcmRUeXBlLlNhZmVNZXRob2RJbnZva2U6XG4gICAgICAgIHZhciBpbnZva2UgPSBgJHtjb250ZXh0fS4ke3Byb3RvUmVjLm5hbWV9KCR7YXJnU3RyaW5nfSlgO1xuICAgICAgICByaHMgPVxuICAgICAgICAgICAgYCR7dGhpcy5fdXRpbE5hbWV9LmlzVmFsdWVCbGFuaygke2NvbnRleHR9KSA/IG51bGwgOiAke3RoaXMuX29ic2VydmUoaW52b2tlLCBwcm90b1JlYyl9YDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5JbnZva2VDbG9zdXJlOlxuICAgICAgICByaHMgPSBgJHtjb250ZXh0fSgke2FyZ1N0cmluZ30pYDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5QcmltaXRpdmVPcDpcbiAgICAgICAgcmhzID0gYCR7dGhpcy5fdXRpbE5hbWV9LiR7cHJvdG9SZWMubmFtZX0oJHthcmdTdHJpbmd9KWA7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFJlY29yZFR5cGUuQ29sbGVjdGlvbkxpdGVyYWw6XG4gICAgICAgIHJocyA9IGAke3RoaXMuX3V0aWxOYW1lfS4ke3Byb3RvUmVjLm5hbWV9KCR7YXJnU3RyaW5nfSlgO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBSZWNvcmRUeXBlLkludGVycG9sYXRlOlxuICAgICAgICByaHMgPSB0aGlzLl9nZW5JbnRlcnBvbGF0aW9uKHByb3RvUmVjKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5LZXllZFJlYWQ6XG4gICAgICAgIHJocyA9IHRoaXMuX29ic2VydmUoYCR7Y29udGV4dH1bJHtnZXRMb2NhbE5hbWUocHJvdG9SZWMuYXJnc1swXSl9XWAsIHByb3RvUmVjKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5LZXllZFdyaXRlOlxuICAgICAgICByaHMgPSBgJHtjb250ZXh0fVske2dldExvY2FsTmFtZShwcm90b1JlYy5hcmdzWzBdKX1dID0gJHtnZXRMb2NhbE5hbWUocHJvdG9SZWMuYXJnc1sxXSl9YDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5DaGFpbjpcbiAgICAgICAgcmhzID0gJ251bGwnO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oYFVua25vd24gb3BlcmF0aW9uICR7cHJvdG9SZWMubW9kZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGAke2dldExvY2FsTmFtZShwcm90b1JlYy5zZWxmSW5kZXgpfSA9ICR7cmhzfTtgO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfb2JzZXJ2ZShleHA6IHN0cmluZywgcmVjOiBQcm90b1JlY29yZCk6IHN0cmluZyB7XG4gICAgLy8gVGhpcyBpcyBhbiBleHBlcmltZW50YWwgZmVhdHVyZS4gV29ya3Mgb25seSBpbiBEYXJ0LlxuICAgIGlmICh0aGlzLl9jaGFuZ2VEZXRlY3Rpb24gPT09IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaE9ic2VydmUpIHtcbiAgICAgIHJldHVybiBgdGhpcy5vYnNlcnZlVmFsdWUoJHtleHB9LCAke3JlYy5zZWxmSW5kZXh9KWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBleHA7XG4gICAgfVxuICB9XG5cbiAgZ2VuUHJvcGVydHlCaW5kaW5nVGFyZ2V0cyhwcm9wZXJ0eUJpbmRpbmdUYXJnZXRzOiBCaW5kaW5nVGFyZ2V0W10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VuRGVidWdJbmZvOiBib29sZWFuKTogc3RyaW5nIHtcbiAgICB2YXIgYnMgPSBwcm9wZXJ0eUJpbmRpbmdUYXJnZXRzLm1hcChiID0+IHtcbiAgICAgIGlmIChpc0JsYW5rKGIpKSByZXR1cm4gXCJudWxsXCI7XG5cbiAgICAgIHZhciBkZWJ1ZyA9IGdlbkRlYnVnSW5mbyA/IGNvZGlmeShiLmRlYnVnKSA6IFwibnVsbFwiO1xuICAgICAgcmV0dXJuIGAke3RoaXMuX3V0aWxOYW1lfS5iaW5kaW5nVGFyZ2V0KCR7Y29kaWZ5KGIubW9kZSl9LCAke2IuZWxlbWVudEluZGV4fSwgJHtjb2RpZnkoYi5uYW1lKX0sICR7Y29kaWZ5KGIudW5pdCl9LCAke2RlYnVnfSlgO1xuICAgIH0pO1xuICAgIHJldHVybiBgWyR7YnMuam9pbihcIiwgXCIpfV1gO1xuICB9XG5cbiAgZ2VuRGlyZWN0aXZlSW5kaWNlcyhkaXJlY3RpdmVSZWNvcmRzOiBEaXJlY3RpdmVSZWNvcmRbXSk6IHN0cmluZyB7XG4gICAgdmFyIGJzID0gZGlyZWN0aXZlUmVjb3Jkcy5tYXAoXG4gICAgICAgIGIgPT5cbiAgICAgICAgICAgIGAke3RoaXMuX3V0aWxOYW1lfS5kaXJlY3RpdmVJbmRleCgke2IuZGlyZWN0aXZlSW5kZXguZWxlbWVudEluZGV4fSwgJHtiLmRpcmVjdGl2ZUluZGV4LmRpcmVjdGl2ZUluZGV4fSlgKTtcbiAgICByZXR1cm4gYFske2JzLmpvaW4oXCIsIFwiKX1dYDtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX2dlbkludGVycG9sYXRpb24ocHJvdG9SZWM6IFByb3RvUmVjb3JkKTogc3RyaW5nIHtcbiAgICB2YXIgaVZhbHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3RvUmVjLmFyZ3MubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlWYWxzLnB1c2goY29kaWZ5KHByb3RvUmVjLmZpeGVkQXJnc1tpXSkpO1xuICAgICAgaVZhbHMucHVzaChgJHt0aGlzLl91dGlsTmFtZX0ucygke3RoaXMuX25hbWVzLmdldExvY2FsTmFtZShwcm90b1JlYy5hcmdzW2ldKX0pYCk7XG4gICAgfVxuICAgIGlWYWxzLnB1c2goY29kaWZ5KHByb3RvUmVjLmZpeGVkQXJnc1twcm90b1JlYy5hcmdzLmxlbmd0aF0pKTtcbiAgICByZXR1cm4gY29tYmluZUdlbmVyYXRlZFN0cmluZ3MoaVZhbHMpO1xuICB9XG5cbiAgZ2VuSHlkcmF0ZURpcmVjdGl2ZXMoZGlyZWN0aXZlUmVjb3JkczogRGlyZWN0aXZlUmVjb3JkW10pOiBzdHJpbmcge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRpcmVjdGl2ZVJlY29yZHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciByID0gZGlyZWN0aXZlUmVjb3Jkc1tpXTtcbiAgICAgIHJlcy5wdXNoKGAke3RoaXMuX25hbWVzLmdldERpcmVjdGl2ZU5hbWUoci5kaXJlY3RpdmVJbmRleCl9ID0gJHt0aGlzLl9nZW5SZWFkRGlyZWN0aXZlKGkpfTtgKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcy5qb2luKFwiXFxuXCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2VuUmVhZERpcmVjdGl2ZShpbmRleDogbnVtYmVyKSB7XG4gICAgLy8gVGhpcyBpcyBhbiBleHBlcmltZW50YWwgZmVhdHVyZS4gV29ya3Mgb25seSBpbiBEYXJ0LlxuICAgIGlmICh0aGlzLl9jaGFuZ2VEZXRlY3Rpb24gPT09IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaE9ic2VydmUpIHtcbiAgICAgIHJldHVybiBgdGhpcy5vYnNlcnZlRGlyZWN0aXZlKHRoaXMuZ2V0RGlyZWN0aXZlRm9yKGRpcmVjdGl2ZXMsICR7aW5kZXh9KSwgJHtpbmRleH0pYDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGB0aGlzLmdldERpcmVjdGl2ZUZvcihkaXJlY3RpdmVzLCAke2luZGV4fSlgO1xuICAgIH1cbiAgfVxuXG4gIGdlbkh5ZHJhdGVEZXRlY3RvcnMoZGlyZWN0aXZlUmVjb3JkczogRGlyZWN0aXZlUmVjb3JkW10pOiBzdHJpbmcge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRpcmVjdGl2ZVJlY29yZHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciByID0gZGlyZWN0aXZlUmVjb3Jkc1tpXTtcbiAgICAgIGlmICghci5pc0RlZmF1bHRDaGFuZ2VEZXRlY3Rpb24oKSkge1xuICAgICAgICByZXMucHVzaChcbiAgICAgICAgICAgIGAke3RoaXMuX25hbWVzLmdldERldGVjdG9yTmFtZShyLmRpcmVjdGl2ZUluZGV4KX0gPSB0aGlzLmdldERldGVjdG9yRm9yKGRpcmVjdGl2ZXMsICR7aX0pO2ApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBnZW5Db250ZW50TGlmZWN5Y2xlQ2FsbGJhY2tzKGRpcmVjdGl2ZVJlY29yZHM6IERpcmVjdGl2ZVJlY29yZFtdKTogc3RyaW5nW10ge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgZXEgPSBJU19EQVJUID8gJz09JyA6ICc9PT0nO1xuICAgIC8vIE5PVEUoa2VnbHVuZXEpOiBPcmRlciBpcyBpbXBvcnRhbnQhXG4gICAgZm9yICh2YXIgaSA9IGRpcmVjdGl2ZVJlY29yZHMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHZhciBkaXIgPSBkaXJlY3RpdmVSZWNvcmRzW2ldO1xuICAgICAgaWYgKGRpci5jYWxsQWZ0ZXJDb250ZW50SW5pdCkge1xuICAgICAgICByZXMucHVzaChcbiAgICAgICAgICAgIGBpZigke3RoaXMuX25hbWVzLmdldFN0YXRlTmFtZSgpfSAke2VxfSAke3RoaXMuX2NoYW5nZURldGVjdG9yU3RhdGVOYW1lfS5OZXZlckNoZWNrZWQpICR7dGhpcy5fbmFtZXMuZ2V0RGlyZWN0aXZlTmFtZShkaXIuZGlyZWN0aXZlSW5kZXgpfS5uZ0FmdGVyQ29udGVudEluaXQoKTtgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRpci5jYWxsQWZ0ZXJDb250ZW50Q2hlY2tlZCkge1xuICAgICAgICByZXMucHVzaChgJHt0aGlzLl9uYW1lcy5nZXREaXJlY3RpdmVOYW1lKGRpci5kaXJlY3RpdmVJbmRleCl9Lm5nQWZ0ZXJDb250ZW50Q2hlY2tlZCgpO2ApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgZ2VuVmlld0xpZmVjeWNsZUNhbGxiYWNrcyhkaXJlY3RpdmVSZWNvcmRzOiBEaXJlY3RpdmVSZWNvcmRbXSk6IHN0cmluZ1tdIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGVxID0gSVNfREFSVCA/ICc9PScgOiAnPT09JztcbiAgICAvLyBOT1RFKGtlZ2x1bmVxKTogT3JkZXIgaXMgaW1wb3J0YW50IVxuICAgIGZvciAodmFyIGkgPSBkaXJlY3RpdmVSZWNvcmRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB2YXIgZGlyID0gZGlyZWN0aXZlUmVjb3Jkc1tpXTtcbiAgICAgIGlmIChkaXIuY2FsbEFmdGVyVmlld0luaXQpIHtcbiAgICAgICAgcmVzLnB1c2goXG4gICAgICAgICAgICBgaWYoJHt0aGlzLl9uYW1lcy5nZXRTdGF0ZU5hbWUoKX0gJHtlcX0gJHt0aGlzLl9jaGFuZ2VEZXRlY3RvclN0YXRlTmFtZX0uTmV2ZXJDaGVja2VkKSAke3RoaXMuX25hbWVzLmdldERpcmVjdGl2ZU5hbWUoZGlyLmRpcmVjdGl2ZUluZGV4KX0ubmdBZnRlclZpZXdJbml0KCk7YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChkaXIuY2FsbEFmdGVyVmlld0NoZWNrZWQpIHtcbiAgICAgICAgcmVzLnB1c2goYCR7dGhpcy5fbmFtZXMuZ2V0RGlyZWN0aXZlTmFtZShkaXIuZGlyZWN0aXZlSW5kZXgpfS5uZ0FmdGVyVmlld0NoZWNrZWQoKTtgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxufVxuIl19