export interface HysOrdenes{
    id: string,
    title: string,
    description: string,
    items: ItemHys[]
    
    }
    
    export interface ItemHys{
    name: string,
    completed: boolean
    
    }