export default class InsertList {
    private columns: string[] = [];
    private params: any[] = [];
    public add(column: string, value: any): boolean {
        if (!value) return false;
        this.columns.push(column);
        this.params.push(value);
        return true;
    }

    public addIf(column: string, value: any, condition: boolean): boolean {
        if (!condition) return false;
        return this.add(column,value);
    }

    public getParams(): any[] {
        return this.params;
    }

    public getClause(): string {
        return `(${this.columns.join(', ')}) VALUES (${this.columns.map(s => '?').join(', ')}) `;
    }
}