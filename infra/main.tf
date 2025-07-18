resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}  

# Static Web App (No App Service Plan Needed!)
resource "azurerm_static_web_app" "swa" {
  name                = var.app_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = "West Europe"
  sku_tier            = "Standard"
  sku_size            = "Standard"

  identity {
    type = "SystemAssigned"
  }
}

# Assign Azure AD permissions to Static Web App
resource "azuread_application" "auth" {
  display_name     = "${var.app_name}-auth"
  sign_in_audience = "AzureADMultipleOrgs"
  web {
    redirect_uris = [
      "https://${azurerm_static_web_app.swa.default_host_name}/.auth/login/aad/callback"
    ]
  }
}

# # Function App with Consumption Plan
# resource "azurerm_storage_account" "function_storage" {
#   name                     = "funcstor${random_string.suffix.result}"
#   resource_group_name      = azurerm_resource_group.rg.name
#   location                 = azurerm_resource_group.rg.location
#   account_tier             = "Standard"
#   account_replication_type = "LRS"
# }

# resource "azurerm_service_plan" "function_plan" {
#   name                = "function-plan"
#   location            = azurerm_resource_group.rg.location
#   resource_group_name = azurerm_resource_group.rg.name
#   os_type             = "Linux"
#   sku_name            = "Y1" # Consumption plan
# }

# resource "azurerm_linux_function_app" "backend_func" {
#   name                       = "orphaned-backend-func"
#   location                   = azurerm_resource_group.rg.location
#   resource_group_name        = azurerm_resource_group.rg.name
#   service_plan_id            = azurerm_service_plan.function_plan.id
#   storage_account_name       = azurerm_storage_account.function_storage.name
#   storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key

#   site_config {
#     application_stack {
#       node_version = "18"
#     }
#   }

#   identity {
#     type = "SystemAssigned"
#   }
# }

# resource "azurerm_role_assignment" "function_rg_reader" {
#   scope                = azurerm_resource_group.rg.id
#   role_definition_name = "Reader"
#   principal_id         = azurerm_linux_function_app.backend_func.identity[0].principal_id
# }

# resource "random_string" "suffix" {
#   length  = 6
#   upper   = false
#   special = false
# } 