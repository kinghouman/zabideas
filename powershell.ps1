$baseUrl = "https://example.com/api/some-endpoint"
$username = "your-username"
$password = "your-password"

# Create a credential object with the username and password
$credential = New-Object System.Management.Automation.PSCredential($username, (ConvertTo-SecureString -String $password -AsPlainText -Force))

# Disable SSL/TLS certificate validation
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

# Set basic authentication header
$encodedCredentials = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($credential.UserName + ":" + $credential.GetNetworkCredential().Password))
$authHeader = "Basic " + $encodedCredentials

# Create the headers hashtable
$headers = @{
    "Authorization" = $authHeader
    "Content-Type" = "application/json"
}

# Create an array of strings
$myArray = @("string1", "string/2", "string3")

# Escape forward slashes in array elements
$escapedArray = $myArray | ForEach-Object { $_ -replace "/", "\\/" }

# Create the body payload with the escaped array
$body = @{
    "key1" = "value1"
    "key2" = $escapedArray
} | ConvertTo-Json

# Make the API POST request
$response = Invoke-WebRequest -Uri $baseUrl -Method Post -Headers $headers -Body $body

# Process the response
$responseContent = $response.Content | ConvertFrom-Json
$responseContent
