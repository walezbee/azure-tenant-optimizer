output "static_web_app_url" {
  value = "https://${azurerm_static_web_app.swa.default_host_name}"
}

# output "function_endpoint" {
#   value = azurerm_linux_function_app.backend_func.default_hostname
#  }