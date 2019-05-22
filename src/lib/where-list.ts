export default class WhereList {
    private columns: string[] = [];
    private params: any[] = [];

    public add(column: string, value: any): boolean {
        if (!value) return false;
        this.columns.push(`(${column} = ?)`);
        this.params.push(value);
        return true;
    }
    
    public addPhrase(phrase: string, ...value: any[]): boolean {
        if (!value || value.length == 0) return false;
        this.columns.push(phrase);
        this.params.concat(value);
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
        if (this.columns.length == 0) return '';
        return ` WHERE ${this.columns.join(' AND ')} `;
    }
}