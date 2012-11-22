<?php

// Connect to database
include("http://jennifermilam.com/7450/dbconnect_infovis.php");

if (!$con)
  {
  die('Could not connect: ' . mysql_error());
  }

mysql_select_db("jennigr9_infovis", $con);

$result = mysql_query("SELECT * FROM Colleges");

while($row = mysql_fetch_array($result))
  {
  echo $row['collegeID'] . " " . $row['name'];
  echo "<br />";
  }

mysql_close($con);
?> 