export default class UpdateList {
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

    public getSetClause(): string {
        return ` SET ${this.columns.map(s => s+' = ?').join(', ')} `;
    }
}