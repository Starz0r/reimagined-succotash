export default class UpdateList {
    private columns: string[] = [];
    private params: any[] = [];
    public add(column: string, value: any): boolean {
        return this.addIf(column,value,value !== undefined);
    }

    public addIf(column: string, value: any, condition: boolean): boolean {
        if (!condition || value === undefined) return false;
        this.columns.push(column);
        this.params.push(value);
        return true;
    }

    public getParams(): any[] {
        return this.params;
    }

    public getSetClause(): string {
        return ` SET ${this.columns.map(s => s+' = ?').join(', ')} `;
    }

    public hasAny(): boolean {
        return this.params.length > 0;
    }
}