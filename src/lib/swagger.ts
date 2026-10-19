import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ViaU API",
      version: "1.0.0",
      description: "Documentação oficial da API ViaU.",
    },
  },
  apis: ["./src/app/api/**/route.ts"],
});
