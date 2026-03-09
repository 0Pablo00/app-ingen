export interface Ordenes{
    id: string,
    title: string,
    description: string,
    items: ItemOrdenes[]
    
    }
    
    export interface ItemOrdenes{
    name: string,
    completed: boolean
    
    }