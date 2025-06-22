declare module '@modelcontextprotocol/sdk/*' {
  const value: any;
  export = value;
}

declare module '@modelcontextprotocol/sdk/server' {
  export const Server: any;
}

declare module '@modelcontextprotocol/sdk/server/stdio' {
  export const StdioServerTransport: any;
}

declare module '@modelcontextprotocol/sdk/client' {
  export const Client: any;
}

declare module '@modelcontextprotocol/sdk/client/stdio' {
  export const StdioClientTransport: any;
}

declare module '@modelcontextprotocol/sdk/types' {
  export const ListToolsRequestSchema: any;
  export const CallToolRequestSchema: any;
}

declare module '@modelcontextprotocol/sdk/server/index.js' {
  export const Server: any;
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export const StdioServerTransport: any;
}

declare module '@modelcontextprotocol/sdk/client/index.js' {
  export const Client: any;
}

declare module '@modelcontextprotocol/sdk/client/stdio.js' {
  export const StdioClientTransport: any;
}

declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export const McpServer: any;
} 