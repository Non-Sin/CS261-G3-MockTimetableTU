param(
    [string]$JavaHome = $env:JAVA_HOME
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($JavaHome)) {
    throw 'Set JAVA_HOME to JDK 21 or pass -JavaHome before starting this test server.'
}

$javaExecutable = Join-Path $JavaHome 'bin/java.exe'
if (-not (Test-Path -LiteralPath $javaExecutable)) { throw 'java.exe was not found in the specified JavaHome.' }
$javaVersion = (& $javaExecutable -version 2>&1 | Out-String)
if ($javaVersion -notmatch 'version "21\.') { throw 'This project requires JDK 21.' }

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$originalJavaHome = $env:JAVA_HOME
$originalPath = $env:PATH
Push-Location (Join-Path $repositoryRoot 'backend')
try {
    $env:JAVA_HOME = $JavaHome
    $env:PATH = "$JavaHome\bin;$originalPath"
    .\mvnw.cmd test-compile dependency:build-classpath '-Dmdep.outputFile=target/quota-postman-classpath.txt'
    if ($LASTEXITCODE -ne 0) { throw 'Compiling the Postman test server failed.' }

    $dependencyClasspath = (Get-Content -Raw -LiteralPath 'target/quota-postman-classpath.txt').Trim()
    $quotaClasspath = "target/test-classes;target/classes;$dependencyClasspath"
    & $javaExecutable '-Dspring.devtools.restart.enabled=false' -cp $quotaClasspath `
        th.ac.tu.cs261.group3.backend.quota.QuotaPostmanApplication
    if ($LASTEXITCODE -ne 0) { throw 'The Postman test server stopped with an error.' }
} finally {
    Pop-Location
    $env:JAVA_HOME = $originalJavaHome
    $env:PATH = $originalPath
}
