$modifyfiles = Get-ChildItem -Path $args[0] -Recurse -Force
foreach($object in $modifyfiles)
{
    $object.CreationTime=("11/11/2011 12:00:00")
    $object.LastAccessTime=("11/11/2011 12:00:00")
    $object.LastWritetime=("11/11/2011 12:00:00")
}

$modifyfiles = Get-Item -Path $args[0] -Force
foreach($object in $modifyfiles)
{
    $object.CreationTime=("11/11/2011 12:00:00")
    $object.LastAccessTime=("11/11/2011 12:00:00")
    $object.LastWritetime=("11/11/2011 12:00:00")
}


echo "All dates modified"
