export default class InsertList {
    private columns: string[] = [];
    private params: any[] = [];
    public add(column: string, value: any): boolean {
        if (!value) return false;
        return this.addDirect(column, value);
    }

    public addIf(column: string, value: any, condition: boolean): boolean {
        if (!condition) return false;
        return this.add(column,value);
    }

    public addDirect(column: string, value: any): boolean {
        this.columns.push(column);
        this.params.push(value);
        return true;
    }

    public getParams(): any[] {
        return this.params;
    }

    public getClause(): string {
        return ` (${this.columns.join(', ')}) VALUES (${this.columns.map(s => '?').join(', ')}) `;
    }
}