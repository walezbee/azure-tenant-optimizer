variable "resource_group_name" {
  description = "Name of the Azure Resource Group"
  default     = "rg-orphaned-resources"
}

variable "location" {
  description = "Azure region (e.g., West Europe)"
  default     = "West Europe"
}

variable "app_name" {
  description = "Name of the Static Web App (e.g., orphaned-resource-web)"
  default     = "orphaned-resource-web"
}

variable "aad_client_id" {
  description = "Azure AD App Registration Client ID"
  type        = string
}

variable "aad_tenant_id" {
  description = "Azure AD Tenant ID"
  type        = string
}